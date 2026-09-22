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
 * @returns the response body plus every system prompt the handler sent.
 */
async function run(body, replies) {
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
			// Route resolution falls back to the stored default model, which is what a
			// real composition always has; without it every request short-circuits to
			// `no-route` before any model call.
			if (key === "settings") return { get: () => ({ provider: "test-provider", model: "test-model" }) };
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

// --- every successful reply carries the build marker -----------------------
ok("build marker on gate reply", first.body.engine === "0.2.0-m2");
ok("build marker on rewrite reply", chipsReply.body.engine === "0.2.0-m2");

process.stdout.write(`handler-smoke: ${pass} passed, ${failures.length} failed\n`);
for (const name of failures) process.stdout.write(`  FAIL ${name}\n`);
process.exit(failures.length === 0 ? 0 : 1);
