#!/usr/bin/env node
/**
 * Build dsh-composer-enhance.
 *
 * Two artifacts, two very different shapes:
 *
 *   lib/index.js   the host half — plain ESM for the Cordis node tree.
 *   lib/client.js  the browser half — a `window.__ModuleLoader__.load({ id, factory })`
 *                  bundle whose factory body is CommonJS. That envelope is exactly
 *                  what the shipped web-client bundles use; the loader only ever
 *                  calls `load` to register a factory, so the envelope is the
 *                  contract, not a build-tool detail.
 *
 * esbuild produces the factory body in CommonJS and this script supplies the
 * envelope, which keeps the emitted shape under our control instead of
 * depending on a bundler's module-format emulation.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const outDir = join(root, "lib");

/**
 * Module requests the client bundle leaves to the platform module table.
 * `dsh.client.inject` in package.json promises the first-party supplier of each
 * non-baseline entry; everything else here is seeded by the shell.
 */
const CLIENT_EXTERNAL = ["react", "react/jsx-runtime", "react-dom", "@deepseek-ai/*"];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// --- host half: ESM for the Cordis node tree --------------------------------
await esbuild.build({
	entryPoints: [join(root, "src/index.ts")],
	outfile: join(outDir, "index.js"),
	bundle: true,
	format: "esm",
	platform: "node",
	target: "node22",
	external: ["@deepseek-ai/*"],
	sourcemap: true,
	logLevel: "warning"
});

// --- client half: CJS factory body wrapped in the loader envelope -----------
const clientBuild = await esbuild.build({
	entryPoints: [join(root, "src/client/index.tsx")],
	write: false,
	bundle: true,
	format: "cjs",
	platform: "browser",
	target: "es2022",
	jsx: "automatic",
	external: CLIENT_EXTERNAL,
	sourcemap: false,
	logLevel: "warning"
});

const output = clientBuild.outputFiles[0];
if (output === undefined) throw new Error("esbuild produced no client output");

const body = output.text
	.replace(/\n?\/\/# sourceMappingURL=.*\n?$/u, "")
	.trimEnd();
const indented = body
	.split("\n")
	.map((line) => line === "" ? "" : `\t\t${line}`)
	.join("\n");

const bundle = [
	"window.__ModuleLoader__.load({",
	`\tid: ${JSON.stringify(pkg.name)},`,
	"\tfactory: (require) => {",
	"\t\tvar module = { exports: {} };",
	"\t\tvar exports = module.exports;",
	"\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: \"Module\" });",
	indented,
	"\t\treturn module.exports;",
	"\t}",
	"});",
	""
].join("\n");

writeFileSync(join(outDir, "client.js"), bundle);

process.stdout.write(
	`built ${pkg.name}@${pkg.version}\n` +
	`  lib/index.js  (host, ESM)\n` +
	`  lib/client.js (client, module-loader id ${pkg.name})\n`
);
