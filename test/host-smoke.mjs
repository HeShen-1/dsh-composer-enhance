/**
 * Offline smoke test for the host half.
 *
 * Runs against the built artifact, not the TypeScript source, so it also proves
 * the bundle esbuild emits is importable and self-contained. No network, no DSH
 * runtime: every case here is pure parsing and normalization.
 *
 *   cd /tmp && node /path/to/dsh-composer-enhance/test/host-smoke.mjs
 *
 * (`cd /tmp` is only needed on a fuse.portal workspace, where Node's
 * `process.cwd()` cannot resolve the workspace path.)
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

// --- parseJsonLoose: copy-paste tolerant extraction -------------------------
ok("json: plain", m.parseJsonLoose("{\"a\":1}")?.a === 1);
ok("json: fenced", m.parseJsonLoose("```json\n{\"a\":2}\n```")?.a === 2);
ok("json: prose around", m.parseJsonLoose("here you go: {\"a\":3} done")?.a === 3);
ok("json: brace inside a string", m.parseJsonLoose("{\"a\":\"x{y}z\"}")?.a === "x{y}z");
ok("json: escaped quote inside a string", m.parseJsonLoose("{\"a\":\"x\\\"y\"}")?.a === "x\"y");
ok("json: nested objects", m.parseJsonLoose("{\"a\":{\"b\":{\"c\":9}}}")?.a?.b?.c === 9);
ok("json: no object -> undefined", m.parseJsonLoose("no json here") === undefined);
ok("json: truncated object -> undefined", m.parseJsonLoose("{\"a\":1") === undefined);

// --- normalizeGate: caps, dedupe, and shape agreement -----------------------
const none = m.normalizeGate(m.parseJsonLoose("{\"hasAmbiguity\":false,\"shape\":\"none\"}"));
ok("gate: none stays none", none.shape === "none" && none.hasAmbiguity === false);

const chips = m.normalizeGate({
	hasAmbiguity: true,
	shape: "chips",
	ambiguityType: "specify",
	reason: "r",
	chips: [{ label: "A" }, { label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }, { label: "E" }]
});
ok("gate: chips deduped and capped at 4", chips.shape === "chips" && chips.chips.length === 4);
ok("gate: chips keep the declared type", chips.ambiguityType === "specify");

const panel = m.normalizeGate({
	shape: "panel",
	questions: [
		{ id: "q1", header: "abcdefghijklmnop", question: "Q1", options: [{ label: "a" }, { label: "b" }, { label: "c" }, { label: "d" }, { label: "e" }, { label: "f" }] },
		{ question: "Q2", options: [{ label: "a" }, { label: "b" }] },
		{ question: "Q3", options: [{ label: "a" }, { label: "b" }] },
		{ question: "Q4", options: [{ label: "a" }, { label: "b" }] },
		{ question: "single option is not a question", options: [{ label: "only" }] }
	]
});
ok("gate: questions capped at 3", panel.questions.length === 3);
ok("gate: options capped at 5", panel.questions[0].options.length === 5);
ok("gate: header truncated to 12", panel.questions[0].header.length === 12);
ok("gate: missing id is numbered", panel.questions[1].id === "q2");

const dropped = m.normalizeGate({ shape: "panel", questions: [{ question: "Q", options: [{ label: "only one" }] }] });
ok("gate: a question with fewer than 2 options is dropped", dropped.shape === "none" && dropped.hasAmbiguity === false);

const mismatched = m.normalizeGate({ shape: "panel", questions: [{ question: "Q", options: [{ label: "a" }, { label: "b" }] }] });
ok("gate: shape follows the payload, not the declaration", mismatched.shape === "panel");

const junk = m.normalizeGate("garbage");
ok("gate: garbage input yields none", junk.shape === "none" && junk.questions.length === 0);

const unknownType = m.normalizeGate({ shape: "chips", ambiguityType: "nonsense", chips: [{ label: "A" }] });
ok("gate: unknown ambiguity type degrades to none", unknownType.ambiguityType === "none" && unknownType.shape === "chips");

// --- parseRewrite: marker-delimited reply ----------------------------------
const P = m.PROMPTS;
const full = m.parseRewrite(
	`${P.MARK_DRAFT}\nRewrite me\n${P.MARK_ISSUES}\n- clarified: 明确了目标\n- added: 补了验收标准\n${P.MARK_ASSUMPTIONS}\n- 用的 Node 20\n`
);
ok("rewrite: draft extracted", full.draft === "Rewrite me");
ok("rewrite: both issues extracted", full.issues.length === 2);
ok("rewrite: issue kinds preserved", full.issues[0].kind === "clarified" && full.issues[1].kind === "added");
ok("rewrite: assumption extracted", full.assumptions[0] === "用的 Node 20");

const draftOnly = m.parseRewrite(`${P.MARK_DRAFT}\nOnly draft\n`);
ok("rewrite: draft without the other sections", draftOnly.draft === "Only draft" && draftOnly.issues.length === 0);

ok("rewrite: no markers yields undefined", m.parseRewrite("no markers at all") === undefined);
ok("rewrite: fence wrapping is tolerated", m.parseRewrite(`\`\`\`\n${P.MARK_DRAFT}\nX\n\`\`\``)?.draft === "X");
ok("rewrite: multiline draft body preserved", m.parseRewrite(`${P.MARK_DRAFT}\nA\n\nB\n${P.MARK_ISSUES}\n`)?.draft === "A\n\nB");

// An unknown kind is not silently relabelled inside the text: a line whose
// prefix is not a single lowercase word keeps its whole body.
const unknownKind = m.parseRewrite(`${P.MARK_DRAFT}\nA\n${P.MARK_ISSUES}\n- weird kind: something\n`);
ok("rewrite: unparsable issue line keeps its full text", unknownKind.issues[0].kind === "clarified" && unknownKind.issues[0].text === "weird kind: something");
const knownPrefix = m.parseRewrite(`${P.MARK_DRAFT}\nA\n${P.MARK_ISSUES}\n- note: dropped prefix\n`);
ok("rewrite: unlisted but well-formed kind keeps only the body", knownPrefix.issues[0].kind === "clarified" && knownPrefix.issues[0].text === "dropped prefix");
ok("rewrite: bullet variants accepted", m.parseRewrite(`${P.MARK_DRAFT}\nA\n${P.MARK_ISSUES}\n• added: x\n* clarified: y\n`)?.issues.length === 2);

// --- export surface --------------------------------------------------------
ok("exports: name", m.name === "composer-enhance");
ok("exports: injects llm", Array.isArray(m.inject) && m.inject.includes("llm"));
ok("exports: route path", m.ROUTE_PATH === "/dsh-composer-enhance/enhance");
ok("exports: prompts present", typeof P.GATE_SYSTEM === "string" && typeof P.REWRITE_SYSTEM === "string" && typeof P.SLOW_SYSTEM === "string");

process.stdout.write(`host-smoke: ${pass} passed, ${failures.length} failed\n`);
for (const name of failures) process.stdout.write(`  FAIL ${name}\n`);
process.exit(failures.length === 0 ? 0 : 1);
