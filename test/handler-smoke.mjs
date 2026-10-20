/**
 * Offline handler test: the request-level state machine.
 *
 * Drives the real route handler with a fake `llm` service, so it pins the
 * decisions that are invisible to the parser tests — above all, *how many model
 * calls a request makes*. That count is what the chips regression was about: a
 * chips reply used to re-enter the gate because "answered" was derived from the
 * question rows instead of the answers, which left the user stuck on a chips
 * row forever.
 *
 *   cd /tmp && node /path/to/dsh-composer-enhance/test/handler-smoke.mjs
 */
const target = process.env.DSHCE_LIB
	?? new URL("../lib/index.js", import.meta.url).pathname;

const m = await import(target);
const P = m.PROMPTS;

let pass = 0;
const failures = [];
const ok = (name, condition) => {
	if (condition) pass += 1;
	else failures.push(name);
};

const GATE_JSON = JSON.stringify({
	hasAmbiguity: true,
	ambiguityType: "specify",
	reason: "缺口径",
	shape: "chips",
	chips: [{ label: "中文" }, { label: "日语" }],
	questions: []
});

const REWRITE_TEXT = `${P.MARK_DRAFT}\n改写结果\n${P.MARK_ISSUES}\n- clarified: 具体改动\n${P.MARK_ASSUMPTIONS}\n`;

/**
 * Run one request through the real handler.
 * @param body - request body.
 * @param replies - model replies, consumed in call order.
 * @param services - extra/overriding services for the fake context.
 * @returns the response body plus every system prompt the handler sent.
 */
async function run(body, replies, services = {}) {
	const sent = [];
	let index = 0;
	const llm = {
		stream: (options) => {
			sent.push({ system: options.system, text: JSON.stringify(options.messages) });
			const reply = replies[Math.min(index, replies.length - 1)];
			index += 1;
			return (async function* () {
				yield { type: "text-delta", text: reply };
			})();
		}
	};
	const ctx = {
		get: (key) => {
			if (key === "llm") return llm;
			// Route resolution ends at `ctx.agentDefaultModel.currentSelection()`,
			// which a real composition always has; without it every request
			// short-circuits to `no-route` before any model call. (The old code read
			// a `settings.get("agent-default-model")` key that no deployment has —
			// that mismatch was the live page's `no-route`.)
			if (key in services) return services[key];
			if (key === "agentDefaultModel") return { currentSelection: () => ({ provider: "test-provider", model: "test-model" }) };
			return undefined;
		},
		logger: { warn: () => {}, info: () => {} }
	};
	const state = { config: { ...m.CONFIG_DEFAULTS } };
	const handler = m.createHandler(ctx, state);

	let captured;
	const req = (async function* () {
		yield Buffer.from(JSON.stringify(body));
	})();
	const res = {
		writeHead: () => {},
		end: (text) => { captured = JSON.parse(text); }
	};
	await handler(req, res);
	return { body: captured, sent, calls: index };
}

// --- first pass, no answers, gate asks -------------------------------------
const first = await run({ draft: "写个 API", sessionId: "", stage: "fast" }, [GATE_JSON]);
ok("first pass: one model call", first.calls === 1);
ok("first pass: returns a gate", first.body.gate?.shape === "chips");
ok("first pass: no draft yet", first.body.draft === undefined);

// --- THE REGRESSION: a chips reply must rewrite, never re-gate -------------
const chipsReply = await run(
	{ draft: "写个 API", sessionId: "", stage: "fast", questions: [], answers: { chips: ["日语"] } },
	[REWRITE_TEXT]
);
ok("chips reply: exactly one model call (no second gate)", chipsReply.calls === 1);
ok("chips reply: returns a draft", typeof chipsReply.body.draft === "string" && chipsReply.body.draft.includes("改写结果"));
ok("chips reply: no gate in the response", chipsReply.body.gate === undefined);
ok("chips reply: the choice reaches the rewrite prompt", chipsReply.sent[0].text.includes("日语"));
ok("chips reply: the choice is framed as a selection", chipsReply.sent[0].text.includes("用户的选择"));
ok("chips reply: the gate prompt was never used", !chipsReply.sent.some((call) => call.system === P.GATE_SYSTEM));

// --- a panel reply rewrites with the framed answers -------------------------
const questions = [{ id: "q1", question: "要哪种语言？", options: [{ label: "中文" }, { label: "日语" }] }];
const panelReply = await run(
	{ draft: "写个 API", sessionId: "", stage: "fast", questions, answers: { q1: ["日语"] } },
	[REWRITE_TEXT]
);
ok("panel reply: one model call", panelReply.calls === 1);
ok("panel reply: returns a draft", typeof panelReply.body.draft === "string");
ok("panel reply: answers framed with their question", panelReply.sent[0].text.includes("要哪种语言？"));

// --- empty answers are NOT an answer ---------------------------------------
const emptyAnswers = await run(
	{ draft: "写个 API", sessionId: "", stage: "fast", questions: [], answers: {} },
	[GATE_JSON]
);
ok("empty answers still gate", emptyAnswers.calls === 1 && emptyAnswers.body.gate?.shape === "chips");
const blankAnswer = await run(
	{ draft: "写个 API", sessionId: "", stage: "fast", questions: [], answers: { chips: ["", "   "] } },
	[GATE_JSON]
);
ok("blank answers still gate", blankAnswer.calls === 1 && blankAnswer.body.gate?.shape === "chips");

// --- a clear draft goes gate -> rewrite in two calls -----------------------
const clean = await run(
	{ draft: "把 README 的安装章节改名", sessionId: "", stage: "fast" },
	[JSON.stringify({ hasAmbiguity: false, shape: "none", chips: [], questions: [] }), REWRITE_TEXT]
);
ok("clear draft: two model calls", clean.calls === 2);
ok("clear draft: returns a draft", typeof clean.body.draft === "string");
ok("clear draft: reports the clean gate", clean.body.gate?.shape === "none");

// --- slow stage rewrites in one call ---------------------------------------
const slow = await run({ draft: "已改写的草稿", sessionId: "", stage: "slow" }, [REWRITE_TEXT]);
ok("slow stage: one model call", slow.calls === 1);
ok("slow stage: echoes the stage", slow.body.stage === "slow");
ok("slow stage: uses the review prompt", slow.sent[0].system === P.SLOW_SYSTEM);

// --- request validation ----------------------------------------------------
const bad = await run({ draft: "   ", sessionId: "", stage: "fast" }, [REWRITE_TEXT]);
ok("blank draft rejected", bad.body.ok === false && bad.body.reason === "bad-request");
ok("blank draft makes no model call", bad.calls === 0);

// --- route resolution failure is a clean no-route reply --------------------
// No session id, no projection, and no deployment default: the old code said
// "no-route" here too, but on the real page it said it for every request. The
// fake context can now drop the default model to pin the honest failure path.
const unrouted = await run({ draft: "写个 API", sessionId: "", stage: "fast" }, [REWRITE_TEXT], { agentDefaultModel: undefined });
ok("no route: reports no-route", unrouted.body.ok === false && unrouted.body.reason === "no-route");
ok("no route: makes no model call", unrouted.calls === 0);
ok("no route: message explains what is missing", typeof unrouted.body.message === "string" && unrouted.body.message.includes("provider/model"));

// --- suggest stage: empty draft → one suggestion, no gate ------------------
const suggest = await run({ draft: "", sessionId: "", stage: "suggest" }, ["建议：把安装章节改成只保留 pnpm 一种方式"]);
ok("suggest: one model call", suggest.calls === 1);
ok("suggest: ok with the suggest stage", suggest.body.ok === true && suggest.body.stage === "suggest");
ok("suggest: response text is normalized", suggest.body.suggestion === "把安装章节改成只保留 pnpm 一种方式");
ok("suggest: uses the suggest prompt", suggest.sent[0].system === P.SUGGEST_SYSTEM);
ok("suggest: carries the build marker", suggest.body.engine === "0.3.0");
ok("suggest: no draft or gate fields", suggest.body.draft === undefined && suggest.body.gate === undefined);

const emptySuggest = await run({ draft: "", sessionId: "", stage: "suggest" }, ["   "]);
ok("suggest: empty model output is empty-result", emptySuggest.body.ok === false && emptySuggest.body.reason === "empty-result");

const nonEmptySuggest = await run({ draft: "写个 API", sessionId: "", stage: "suggest" }, [REWRITE_TEXT]);
ok("suggest: a non-empty draft is rejected without a model call", nonEmptySuggest.body.reason === "bad-request" && nonEmptySuggest.calls === 0);

const noRouteSuggest = await run({ draft: "", sessionId: "", stage: "suggest" }, [REWRITE_TEXT], { agentDefaultModel: undefined });
ok("suggest: no route is reported without a model call", noRouteSuggest.body.reason === "no-route" && noRouteSuggest.calls === 0);

// --- installed-environment grounding reaches the gate and the rewrite ------
// The live report: a draft naming an installed skill produced the question
// "「/karpathy-guidelines」不是明确内容……". The fix injects the installed
// catalogs; these cases pin that the block reaches the gate and the rewrite
// prompt, and that the suggest stage does not pay for it.
const envServices = {
	sessions: { get: () => ({ header: { cwd: "/work/project" } }) },
	skills: { list: async () => [{ name: "karpathy-guidelines", description: "编码规范" }] },
	agents: { get: () => ({}) },
	commands: { list: () => [{ name: "grill-me", description: "拷问" }] },
	pluginManager: { listPlugins: async () => [{ moduleName: "dsh-mnemon", enabled: true }] }
};
const envGate = await run(
	{ draft: "使用dsh-mnemon插件工具记录项目情况，然后把 /karpathy-guidelines 保存到AGENTS.md；", sessionId: "session-1", stage: "fast" },
	[GATE_JSON],
	envServices
);
ok("env: the gate prompt carries the installed catalogs", envGate.sent[0].text.includes("karpathy-guidelines") && envGate.sent[0].text.includes("dsh-mnemon"));
ok("env: the gate prompt carries the slash-command catalog", envGate.sent[0].text.includes("grill-me"));
ok("env: the reply reports environment grounding", envGate.body.contextUsed.includes("environment"));
ok("env: the block says it is not a path", envGate.sent[0].text.includes("不是文件路径"));

const envRewrite = await run(
	{ draft: "写个 API", sessionId: "session-1", stage: "fast", questions: [], answers: { chips: ["中文"] } },
	[REWRITE_TEXT],
	envServices
);
ok("env: the rewrite prompt carries the installed catalogs", envRewrite.sent[0].text.includes("karpathy-guidelines"));

const envSuggest = await run({ draft: "", sessionId: "session-1", stage: "suggest" }, ["把安装章节改成只保留 pnpm"], envServices);
ok("env: the suggestion prompt omits the catalogs", !envSuggest.sent[0].text.includes("karpathy-guidelines"));
ok("env: the suggestion reply reports no environment grounding", envSuggest.body.contextUsed.includes("environment") === false);

// --- every successful reply carries the build marker -----------------------
ok("build marker on gate reply", first.body.engine === "0.3.0");
ok("build marker on rewrite reply", chipsReply.body.engine === "0.3.0");

process.stdout.write(`handler-smoke: ${pass} passed, ${failures.length} failed\n`);
for (const name of failures) process.stdout.write(`  FAIL ${name}\n`);
process.exit(failures.length === 0 ? 0 : 1);
