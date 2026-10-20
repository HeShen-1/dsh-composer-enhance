/**
 * Offline test for the next-message suggestion scheduler.
 *
 * The live "有时回复完等了一会，输入框也没有提示" report had three causes, and
 * this file pins each one at the store level:
 *
 *   - a turn ending inside the 10s rate window used to be dropped forever
 *     (nothing re-armed the attempt), so it must now be rescheduled;
 *   - a shown suggestion used to expire after 60s even while the composer was
 *     still empty and idle, so it must now stay until the user acts;
 *   - a failed request used to disappear silently, so it must now earn one
 *     retry.
 *
 * The store lives inside the built client bundle, so this test loads that
 * artifact with a fake module loader, a fake clock, and a fake `fetch` — no
 * browser, no DSH runtime, no network.
 *
 *   cd /tmp && node /path/to/dsh-composer-enhance/test/suggestion-smoke.mjs
 */
import { readFileSync } from "node:fs";

const bundlePath = process.env.DSHCE_CLIENT
	?? new URL("../lib/client.js", import.meta.url).pathname;
const source = readFileSync(bundlePath, "utf8");

// The store's diagnostics are deliberate in a page console; this test asserts
// state, not log lines, so keep the run quiet.
console.debug = () => {};

let pass = 0;
const failures = [];
const ok = (name, condition) => {
	if (condition) pass += 1;
	else failures.push(name);
};

// --- fake clock -----------------------------------------------------------
const REAL_TIMEOUT = globalThis.setTimeout;
let now = 1_000_000;
const timers = new Map();
let timerSeq = 0;

globalThis.setTimeout = (callback, delay = 0) => {
	const id = ++timerSeq;
	timers.set(id, { at: now + Math.max(0, Number(delay) || 0), callback });
	return id;
};
globalThis.clearTimeout = (id) => {
	timers.delete(id);
};
Date.now = () => now;

/** Let every pending promise chain settle. */
async function settle() {
	for (let index = 0; index < 12; index += 1) {
		await new Promise((resolve) => setImmediate(resolve));
	}
}

/** Advance the clock by `ms`, firing every timer that becomes due. */
async function advance(ms) {
	now += ms;
	await settle();
	for (let guard = 0; guard < 100; guard += 1) {
		const due = [...timers.entries()]
			.filter(([, timer]) => timer.at <= now)
			.sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
		if (due === undefined) break;
		timers.delete(due[0]);
		due[1].callback();
		await settle();
	}
	await settle();
}

// --- fake fetch -----------------------------------------------------------
let calls = [];
let reply = async () => ({ ok: true, json: async () => ({ ok: true, suggestion: "把安装章节改成只保留 pnpm 一种方式" }) });
globalThis.fetch = (url, init) => {
	calls.push({ url, body: JSON.parse(init.body) });
	return reply(url, init);
};

// --- load the built client bundle ----------------------------------------
let registration;
globalThis.window = { __ModuleLoader__: { load: (value) => { registration = value; } } };
// The envelope is a plain script, not an ESM module: run it with the fake window
// in scope, then execute the factory with stubbed externals. Only `store.ts`
// behaviour is exercised here, so the React primitives never need to resolve.
new Function("window", source)(globalThis.window);
const client = registration.factory(() => ({}));
const createFlowStore = client.createFlowStore;
ok("bundle: the store factory is exported", typeof createFlowStore === "function");

const facts = { draft: "", draftRev: 0, phase: "plain", refCount: 0, attachmentCount: 0 };
const running = (running) => ({ running, blank: false, visible: true, focused: true });

/** A fresh store with one completed turn behind it (or a blank one). */
function newStore({ blank = false } = {}) {
	const store = createFlowStore("session-1");
	store.bind({ sessionId: "session-1" });
	store.sync({ ...facts });
	store.observeIdle({ running: true, blank, visible: true, focused: true });
	store.observeIdle({ running: false, blank, visible: true, focused: true });
	return store;
}

/** Reset the fetch log between cases without touching the clock. */
function resetFetch() {
	calls = [];
	reply = async () => ({ ok: true, json: async () => ({ ok: true, suggestion: "把安装章节改成只保留 pnpm 一种方式" }) });
}

// --- case 1: a turn end requests exactly one suggestion -------------------
resetFetch();
let store = newStore();
await advance(699);
ok("turn end: no request before the 700ms debounce", calls.length === 0);
await advance(1);
ok("turn end: one request after the debounce", calls.length === 1);
ok("turn end: the request is the suggest stage", calls[0].body.stage === "suggest" && calls[0].body.draft === "");
ok("turn end: the suggestion is shown", store.getSnapshot().suggestStatus === "shown");
ok("turn end: the suggestion text is normalized", store.getSnapshot().suggestion.includes("pnpm"));

// --- case 2: a turn inside the 10s window is rescheduled, not dropped -----
// The store was created at t0; the first request ran at ~t0+700. End a second
// turn two seconds later: the attempt must wait out the rate window.
await advance(1_300);
store.observeIdle(running(true));
await advance(500);
store.observeIdle(running(false));
await advance(900); // still well inside the 10s window since the first request
ok("rate window: no immediate second request", calls.length === 1);
await advance(8_000);
ok("rate window: the attempt fires when the clock expires", calls.length === 2);

// --- case 3: a shown suggestion does not expire ---------------------------
await advance(10 * 60_000);
ok("no expiry: still shown after ten minutes", store.getSnapshot().suggestStatus === "shown");
ok("no expiry: no extra request", calls.length === 2);

// --- case 4: one transport failure is retried ----------------------------
resetFetch();
reply = async () => {
	throw new Error("network down");
};
await advance(20_000);
store.observeIdle(running(true));
await advance(100);
store.observeIdle(running(false));
await advance(700);
ok("failure: the first attempt happens", calls.length === 1);
ok("failure: the failed attempt leaves no suggestion", store.getSnapshot().suggestStatus === "none");
await advance(10_000);
ok("failure: the attempt is retried once", calls.length === 2);
await advance(120_000);
ok("failure: a second failure is not retried again", calls.length === 2);
ok("failure: the composer stays empty", store.getSnapshot().suggestStatus === "none");

// --- case 5: a host-level failure also earns one retry -------------------
resetFetch();
let first = true;
reply = async () => {
	if (first) {
		first = false;
		return { ok: true, json: async () => ({ ok: false, reason: "empty-result" }) };
	}
	return { ok: true, json: async () => ({ ok: true, suggestion: "把结论写进 README" }) };
};
await advance(20_000);
store.observeIdle(running(true));
await advance(100);
store.observeIdle(running(false));
await advance(700);
ok("empty result: attempt one fails", calls.length === 1 && store.getSnapshot().suggestStatus === "none");
await advance(10_000);
ok("empty result: attempt two succeeds", calls.length === 2 && store.getSnapshot().suggestStatus === "shown");

// --- case 6: an explicit close is not chased ----------------------------
store.dismissSuggestion();
ok("dismiss: the suggestion is gone", store.getSnapshot().suggestStatus === "none");
store.observeIdle(running(true));
await advance(100);
store.observeIdle(running(false));
await advance(700);
ok("dismiss: a turn inside the suppression window requests nothing", calls.length === 2);
await advance(60_000);
ok("dismiss: the suppression is not chased after it expires", calls.length === 2);
store.observeIdle(running(true));
await advance(100);
store.observeIdle(running(false));
await advance(700);
ok("dismiss: a later turn is served again", calls.length === 3);

// --- case 7: editing the draft retires the suggestion --------------------
await advance(20_000);
store.observeIdle(running(true));
await advance(100);
store.observeIdle(running(false));
await advance(700);
ok("draft edit: a suggestion is shown first", store.getSnapshot().suggestStatus === "shown");
store.sync({ ...facts, draft: "写点别的", draftRev: 1 });
ok("draft edit: typing retires the suggestion", store.getSnapshot().suggestStatus === "none");

// --- case 8: a blank Session is never asked -----------------------------
resetFetch();
store = newStore({ blank: true });
await advance(5_000);
ok("blank session: no request", calls.length === 0);
ok("blank session: nothing shown", store.getSnapshot().suggestStatus === "none");

// --- case 9: a client reload with an idle Session recovers on focus ------
// A rebuilt store starts with lastRunning=false, so no turn edge exists. Focus
// is the recovery path; without it the suggestion would never be requested.
resetFetch();
const recovered = createFlowStore("session-2");
recovered.bind({ sessionId: "session-2" });
recovered.sync({ ...facts });
recovered.observeIdle({ running: false, blank: false, visible: true, focused: false });
await advance(5_000);
ok("reload recovery: an unfocused idle Session requests nothing", calls.length === 0);
recovered.observeIdle({ running: false, blank: false, visible: true, focused: true });
await advance(700);
ok("reload recovery: focus requests the suggestion", calls.length === 1);

// --- case 10: a restored visible tab re-arms ----------------------------
await advance(20_000);
resetFetch();
const hidden = newStore();
await advance(700);
ok("visibility: the turn-end suggestion is shown", hidden.getSnapshot().suggestStatus === "shown");
hidden.observeIdle({ running: true, blank: false, visible: true, focused: false });
hidden.observeIdle({ running: false, blank: false, visible: false, focused: false });
await advance(120_000);
hidden.observeIdle({ running: false, blank: false, visible: true, focused: false });
await advance(700);
ok("visibility: returning to the tab requests again", calls.length === 2);

// --- report -------------------------------------------------------------
globalThis.setTimeout = REAL_TIMEOUT;
if (failures.length > 0) {
	console.error(`suggestion-smoke: ${failures.length} failed`);
	for (const name of failures) console.error(`  ✗ ${name}`);
	process.exit(1);
}
console.log(`suggestion-smoke: ${pass} passed`);
