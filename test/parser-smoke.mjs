/**
 * Offline parser test: the layer that decides what counts as a model answer.
 *
 * The other three smoke tests cover grounding, the request-level state machine
 * and host routing. None of them pins the parsers directly — yet that is where
 * a shape change in model output (a fence, a missing field, `chips` turning
 * into an object) silently turns into "nothing happens in the UI".
 *
 *   cd /tmp && node /path/to/dsh-composer-enhance/test/parser-smoke.mjs
 */
const target = process.env.DSHCE_LIB
	?? new URL("../lib/index.js", import.meta.url).pathname;

const m = await import(target);
const { parseJsonLoose, normalizeGate, parseRewrite, PROMPTS } = m;

let pass = 0;
const failures = [];
const ok = (name, condition) => {
	if (condition) pass += 1;
	else failures.push(name);
};

// --- parseJsonLoose：从模型的自由文本里抠 JSON ---------------------------------

ok("plain json", parseJsonLoose('{"a":1}')?.a === 1);
ok("fenced json", parseJsonLoose('```json\n{"a":2}\n```')?.a === 2);
ok("fence without language", parseJsonLoose('```\n{"a":3}\n```')?.a === 3);
ok("prose around json", parseJsonLoose('好的，结果如下：{"a":4} 以上。')?.a === 4);
ok("nested braces", parseJsonLoose('{"a":{"b":[1,2]}}')?.a?.b?.[1] === 2);
ok("brace inside string does not close early", parseJsonLoose('{"a":"} not the end"}')?.a === "} not the end");
ok("escaped quote inside string", parseJsonLoose('{"a":"say \\"hi\\""}')?.a === 'say "hi"');
ok("no object -> undefined", parseJsonLoose("没有 JSON") === undefined);
ok("malformed json -> undefined", parseJsonLoose('{"a": }') === undefined);
ok("unterminated object -> undefined", parseJsonLoose('{"a":1') === undefined);
ok("non-string input -> undefined", parseJsonLoose(null) === undefined && parseJsonLoose({ a: 1 }) === undefined);

// --- normalizeGate：缺字段 / 类型错 / 互斥时的兜底 -------------------------------

const empty = normalizeGate(null);
ok("null -> empty defaults", empty.hasAmbiguity === false && empty.shape === "none" && empty.chips.length === 0);
ok("primitive -> empty defaults", normalizeGate("nope").shape === "none");
ok("bad ambiguityType -> none", normalizeGate({ ambiguityType: "wild", chips: ["a"] }).ambiguityType === "none");
ok("chips from strings", JSON.stringify(normalizeGate({ chips: ["中文", "日语"] }).chips) === JSON.stringify([{ label: "中文" }, { label: "日语" }]));
ok("chips from objects + trim", normalizeGate({ chips: [{ label: "  中文  " }] }).chips[0]?.label === "中文");
ok("chips dedup", normalizeGate({ chips: ["a", "a", "b"] }).chips.length === 2);
ok("chips capped at 4", normalizeGate({ chips: ["a", "b", "c", "d", "e"] }).chips.length === 4);
ok("empty label dropped", normalizeGate({ chips: ["", "   ", "x"] }).chips.length === 1);
ok("non-array chips -> []", normalizeGate({ chips: "中文" }).chips.length === 0);
ok("chips shape when only chips", normalizeGate({ chips: ["a"] }).shape === "chips");

const oneOption = normalizeGate({ questions: [{ question: "口径?", options: [{ label: "只此一个" }] }] });
ok("question with <2 options dropped", oneOption.shape === "none" && oneOption.questions.length === 0);

const panel = normalizeGate({
	reason: "缺口径",
	ambiguityType: "specify",
	chips: ["中文"],
	questions: [
		{ header: "这是一个超过十二个字的表头", question: "口径?", options: [{ label: "A" }, { label: "B", description: "说明", recommended: true }] },
		{ question: "范围?", options: [{ label: "X" }, { label: "Y" }] },
	],
});
ok("panel wins over chips", panel.shape === "panel" && panel.chips.length === 0 && panel.hasAmbiguity === true);
ok("panel keeps type + reason", panel.ambiguityType === "specify" && panel.reason === "缺口径");
ok("question id defaults to q1/q2", panel.questions[0]?.id === "q1" && panel.questions[1]?.id === "q2");
ok("header sliced to 12 chars", panel.questions[0]?.header.length === 12);
ok("option description + recommended kept", panel.questions[0]?.options[1]?.description === "说明" && panel.questions[0]?.options[1]?.recommended === true);
ok("questions capped at 3", normalizeGate({
	questions: Array.from({ length: 5 }, (_, i) => ({ question: `q${i}`, options: [{ label: "A" }, { label: "B" }] })),
}).questions.length === 3);
ok("options capped at 5", normalizeGate({
	questions: [{ question: "q", options: Array.from({ length: 8 }, (_, i) => ({ label: `L${i}` })) }],
}).questions[0]?.options.length === 5);

// --- parseRewrite：三段标记缺失时的降级 ----------------------------------------

const M = PROMPTS ?? { MARK_DRAFT: "===DRAFT===", MARK_ISSUES: "===ISSUES===", MARK_ASSUMPTIONS: "===ASSUMPTIONS===" };
const rewrite = parseRewrite(
	`${M.MARK_DRAFT}\n改写后的草稿\n${M.MARK_ISSUES}\n- added: 加了约束\n- assumption: 假定用中文\n${M.MARK_ASSUMPTIONS}\n- 默认按月\n`,
);
ok("rewrite draft", rewrite?.draft === "改写后的草稿");
ok("rewrite issue kinds", rewrite?.issues[0]?.kind === "added" && rewrite?.issues[1]?.kind === "assumption");
ok("rewrite assumptions", rewrite?.assumptions?.[0] === "默认按月");
ok("unknown issue kind -> clarified", parseRewrite(`${M.MARK_DRAFT}\n草稿\n${M.MARK_ISSUES}\n- whatever: 内容\n`)?.issues[0]?.kind === "clarified");
ok("missing draft -> undefined", parseRewrite(`${M.MARK_ISSUES}\n- x: y\n`) === undefined);
ok("fenced rewrite still parsed", parseRewrite('```\n' + `${M.MARK_DRAFT}\n围栏里的草稿\n` + '```')?.draft === "围栏里的草稿");
ok("non-string -> undefined", parseRewrite(null) === undefined);

console.log(`parser-smoke: ${pass} passed, ${failures.length} failed`);
if (failures.length > 0) {
	console.error(failures.map((f) => `  ✗ ${f}`).join("\n"));
	process.exit(1);
}
