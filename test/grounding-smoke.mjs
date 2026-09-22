/**
 * Offline test for session grounding: recent turns and project instructions.
 *
 * Uses a fake `sessionQuery` and a throwaway working directory, so it needs no
 * DSH runtime and no network. Run it the same way as host-smoke.mjs:
 *
 *   cd /tmp && node /path/to/dsh-composer-enhance/test/grounding-smoke.mjs
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const target = process.env.DSHCE_LIB
	?? new URL("../lib/index.js", import.meta.url).pathname;

const m = await import(target);

let pass = 0;
const failures = [];
const ok = (name, condition) => {
	if (condition) pass += 1;
	else failures.push(name);
};

const logger = { warn: () => {}, info: () => {} };

/** Build a plugin context whose only service is a stubbed session query. */
const ctxWith = (readSurface) => ({
	get: (key) => key === "sessionQuery" ? { readSurface } : undefined,
	logger
});

const userEvent = (text) => ({ type: "user/message", message: { content: [{ type: "text", text }] } });
const assistantEvent = (text) => ({ type: "assistant/message", message: { content: [{ type: "text", text }] } });
const toolEvent = (text) => ({ type: "tool/result", message: { content: [{ type: "text", text }] } });

const workdir = "/tmp/dshce-grounding-fixture";
rmSync(workdir, { recursive: true, force: true });
mkdirSync(workdir, { recursive: true });

// --- no session id, no service, failing service ----------------------------
ok("grounding: empty session id contributes nothing",
	(await m.collectSessionGrounding(ctxWith(async () => ({})), "", 8)).used.length === 0);
ok("grounding: missing service contributes nothing",
	(await m.collectSessionGrounding({ get: () => undefined, logger }, "s1", 8)).used.length === 0);
const failing = await m.collectSessionGrounding(ctxWith(async () => { throw new Error("boom"); }), "s1", 8);
ok("grounding: a throwing readSurface degrades to nothing", failing.text === "" && failing.used.length === 0);

// --- recent turns ----------------------------------------------------------
const turns = await m.collectSessionGrounding(
	ctxWith(async () => ({ session: { cwd: "" }, events: [userEvent("第一个问题"), assistantEvent("第一个回答"), toolEvent("工具输出不应出现")] })),
	"s1",
	8
);
ok("grounding: recent turns reported", turns.used.includes("recentTurns"));
ok("grounding: user turn labelled", turns.text.includes("用户：第一个问题"));
ok("grounding: assistant turn labelled", turns.text.includes("助手：第一个回答"));
ok("grounding: tool results excluded", !turns.text.includes("工具输出不应出现"));

const windowed = await m.collectSessionGrounding(
	ctxWith(async () => ({ session: { cwd: "" }, events: [userEvent("一"), userEvent("二"), userEvent("三")] })),
	"s1",
	2
);
ok("grounding: turn window keeps the newest", windowed.text.includes("三") && !windowed.text.includes("一"));

const nested = await m.collectSessionGrounding(
	ctxWith(async () => ({ session: { cwd: "" }, events: [{ type: "user/message", data: { message: { content: [{ type: "text", text: "嵌套形态" }] } } }] })),
	"s1",
	8
);
ok("grounding: data.message shape also read", nested.text.includes("嵌套形态"));

const noText = await m.collectSessionGrounding(
	ctxWith(async () => ({ session: { cwd: "" }, events: [{ type: "user/message", message: { content: [{ type: "image" }] } }] })),
	"s1",
	8
);
ok("grounding: a turn with no text contributes nothing", noText.used.length === 0);

// --- project instructions --------------------------------------------------
writeFileSync(join(workdir, "AGENTS.md"), "# 项目约定\n永远用中文回答。\n");
const withProject = await m.collectSessionGrounding(
	ctxWith(async () => ({ session: { cwd: workdir }, events: [] })),
	"s1",
	8
);
ok("grounding: project file reported", withProject.used.includes("projectMemory"));
ok("grounding: project file content included", withProject.text.includes("永远用中文回答"));
ok("grounding: project file named in the label", withProject.text.includes("AGENTS.md"));

writeFileSync(join(workdir, "AGENTS.md"), "   \n");
writeFileSync(join(workdir, "CLAUDE.md"), "回退到 CLAUDE.md");
const fallback = await m.collectSessionGrounding(
	ctxWith(async () => ({ session: { cwd: workdir }, events: [] })),
	"s1",
	8
);
ok("grounding: blank AGENTS.md falls through to CLAUDE.md", fallback.text.includes("回退到 CLAUDE.md"));

const missingDir = await m.collectSessionGrounding(
	ctxWith(async () => ({ session: { cwd: "/tmp/dshce-does-not-exist-9d7f" }, events: [] })),
	"s1",
	8
);
ok("grounding: unreadable directory degrades quietly", missingDir.used.length === 0);

rmSync(workdir, { recursive: true, force: true });

process.stdout.write(`grounding-smoke: ${pass} passed, ${failures.length} failed\n`);
for (const name of failures) process.stdout.write(`  FAIL ${name}\n`);
process.exit(failures.length === 0 ? 0 : 1);
