/**
 * Offline test for installed-environment grounding.
 *
 * The live regression this pins: a draft `把 /karpathy-guidelines 保存到
 * AGENTS.md` made the gate ask what "/karpathy-guidelines" was, because the
 * model had no way to know it is an installed skill rather than a path. These
 * cases drive the real collector with fake `skills` / `commands` / `agents` /
 * `pluginManager` services, so they also pin the degradation paths (a
 * deployment missing one service must not fail the request).
 *
 *   cd /tmp && node /path/to/dsh-composer-enhance/test/environment-smoke.mjs
 */
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

/** Build a fake plugin context from a `{ serviceName: value }` map. */
const ctxWith = (services) => ({
	get: (key) => services[key],
	logger
});

const skills = (...names) => ({
	list: async () => names.map(([name, description]) => ({ name, description }))
});

const sessionServices = (extra = {}) => ({
	sessions: { get: () => ({ header: { cwd: "/work/project" } }) },
	skills: skills(
		["karpathy-guidelines", "Karpathy 的编码规范：先想后写、最小实现、外科式改动"],
		["grilling", "用连续提问拷问一个方案"],
		["caveman", "简洁输出模式"]
	),
	agents: { get: () => ({ id: "agent-1" }) },
	commands: { list: () => [{ name: "grill-me", description: "拷问一个方案" }, { name: "handoff", description: "写入会话交接" }] },
	pluginManager: {
		listPlugins: async () => [
			{ moduleName: "dsh-mnemon", enabled: true },
			{ moduleName: "dsh-composer-enhance", enabled: true },
			{ moduleName: "@deepseek-ai/dsh-tool-fs", enabled: true },
			{ moduleName: "disabled-plugin", enabled: false }
		]
	},
	...extra
});

// --- empty catalogs -------------------------------------------------------
ok("env: empty catalogs render nothing",
	m.buildEnvironmentGrounding({ skills: [], commands: [], plugins: [] }) === "");

const skillsOnly = m.buildEnvironmentGrounding({
	skills: [{ name: "grilling", description: "拷问一个方案" }],
	commands: [],
	plugins: []
});
ok("env: skills only has the header", skillsOnly.startsWith("【当前 DSH 环境"));
ok("env: skills rendered with a description", skillsOnly.includes("grilling（拷问一个方案）"));
ok("env: no command line without commands", !skillsOnly.includes("斜杠命令"));
ok("env: no plugin line without plugins", !skillsOnly.includes("- 插件"));

// --- dedupe and budgets ---------------------------------------------------
const manySkills = Array.from({ length: 120 }, (_, index) => ({
	name: `skill-${index}`,
	description: "很长的技能描述".repeat(10)
}));
const huge = m.buildEnvironmentGrounding({ skills: manySkills, commands: [], plugins: [] });
ok("env: a huge catalog is clipped with an ellipsis", huge.includes("…"));
ok("env: a huge catalog stays bounded", huge.length < 3000);

// --- the live collector ---------------------------------------------------
const collected = await m.collectEnvironmentGrounding(ctxWith(sessionServices()), "session-1");
ok("env: collector reports the environment source", collected.used.includes("environment"));
ok("env: skill name present", collected.text.includes("karpathy-guidelines"));
ok("env: command name prefixed as a slash command", collected.text.includes("grill-me（拷问一个方案）"));
ok("env: enabled plugin present", collected.text.includes("dsh-mnemon"));
ok("env: disabled plugin skipped", !collected.text.includes("disabled-plugin"));
ok("env: scoped plugin present", collected.text.includes("@deepseek-ai/dsh-tool-fs"));

const deduped = await m.collectEnvironmentGrounding(ctxWith(sessionServices({
	skills: skills(["grilling", "a"], ["grilling", "b"]),
	commands: { list: () => [{ name: "x", description: "1" }, { name: "x", description: "2" }] },
	pluginManager: { listPlugins: async () => [{ moduleName: "p", enabled: true }, { moduleName: "p", enabled: true }] }
})), "session-1");
ok("env: duplicate skills collapsed", deduped.text.split("grilling").length === 2);
ok("env: duplicate commands collapsed", deduped.text.split("x（1）").length === 2);
ok("env: duplicate plugins collapsed", (deduped.text.match(/- 插件：p$/mu) ?? []).length === 1);

// --- cwd forwarding for project-scoped skills -----------------------------
let seenOptions;
const cwdCtx = ctxWith(sessionServices({
	skills: { list: async (options) => { seenOptions = options; return []; } }
}));
await m.collectEnvironmentGrounding(cwdCtx, "session-1");
ok("env: the session cwd is forwarded to skill discovery", seenOptions?.cwd === "/work/project");
const emptyCwd = ctxWith(sessionServices({
	sessions: { get: () => ({ header: {} }) },
	skills: { list: async (options) => { seenOptions = options; return []; } }
}));
await m.collectEnvironmentGrounding(emptyCwd, "session-1");
ok("env: an unknown cwd omits the option", seenOptions !== undefined && !("cwd" in seenOptions));

// --- degradation paths ----------------------------------------------------
const noServices = await m.collectEnvironmentGrounding(ctxWith({}), "session-1");
ok("env: missing services render nothing", noServices.text === "" && noServices.used.length === 0);

const throwing = await m.collectEnvironmentGrounding(ctxWith({
	sessions: { get: () => { throw new Error("boom"); } },
	skills: { list: async () => { throw new Error("boom"); } },
	agents: { get: () => { throw new Error("boom"); } },
	commands: { list: () => { throw new Error("boom"); } },
	pluginManager: { listPlugins: async () => { throw new Error("boom"); } }
}), "session-1");
ok("env: throwing services degrade to nothing", throwing.text === "" && throwing.used.length === 0);

const noAgent = await m.collectEnvironmentGrounding(ctxWith(sessionServices({
	agents: undefined
})), "session-1");
ok("env: commands are skipped without a live agent", !noAgent.text.includes("grill-me"));

const emptySessionId = await m.collectEnvironmentGrounding(ctxWith(sessionServices()), "");
ok("env: an empty session id skips session-scoped reads", !emptySessionId.text.includes("grill-me") && emptySessionId.text.includes("karpathy-guidelines"));

// --- the block says what it is -------------------------------------------
ok("env: the block is identified as installed entities", collected.text.includes("已安装的真实实体"));
ok("env: the block says it is not a file path", collected.text.includes("不是文件路径"));

// --- report ---------------------------------------------------------------
if (failures.length > 0) {
	console.error(`environment-smoke: ${failures.length} failed`);
	for (const name of failures) console.error(`  ✗ ${name}`);
	process.exit(1);
}
console.log(`environment-smoke: ${pass} passed`);
