/**
 * Per-session flow store.
 *
 * One store per Session, shared by the two slot components (the button in
 * `conversation.input.right` and the dock in `conversation.input.dock`), so a
 * pick in the dock is visible to the button without any prop threading.
 *
 * Three rules here were paid for by the previous hand-written plugin and are
 * load-bearing:
 *
 *   - `getSnapshot()` returns a NEW object whenever state changed, because
 *     `useSyncExternalStore` compares with `Object.is`.
 *   - the flow is cancellable, and cancelling is what the slot's unmount
 *     cleanup does — with an empty dependency list, or it would run after
 *     every render and kill the flow the moment it starts.
 *   - `setDraft` is called exactly once per accepted rewrite (never while
 *     streaming), because every call is a separate undo step in the composer.
 */
import {
	CHIPS_ANSWER_KEY,
	MAX_GATE_ROUNDS,
	ROUTE,
	chipQuestionEcho,
	normalizeAssumptions,
	normalizeChips,
	normalizeGate,
	normalizeIssues,
	normalizeQuestions,
	type ChipOption,
	type EnhanceRequest,
	type EnhanceResult,
	type GateQuestion,
	type Issue
} from "./protocol";

/** Draft facts the composer publishes into a slot component. */
export interface DraftFacts {
	draft: string;
	draftRev: number;
	phase: string;
	refCount: number;
	attachmentCount: number;
}

/** Where the flow currently stands. */
export type FlowStatus = "idle" | "gating" | "writing" | "chips" | "panel" | "done" | "failed";

/** Everything both slot components render from. */
export interface FlowState {
	status: FlowStatus;
	/** Draft text the run started from; also the restore target. */
	baselineDraft: string;
	/** Gate's one-line explanation, shown next to the chips and questions. */
	reason: string;
	chips: ChipOption[];
	questions: GateQuestion[];
	answers: Record<string, string[]>;
	freeText: Record<string, string>;
	chipOther: string;
	chipOtherOpen: boolean;
	issues: Issue[];
	assumptions: string[];
	/** Exactly the text this run wrote, so a later user edit can be told apart. */
	writtenDraft: string | null;
	/** Protocol failure code, or one the client adds (`network`, `aborted`). */
	errorCode: string;
	/** Host-supplied human message; wins over the code when present. */
	errorMessage: string;
	/** Gate rounds already spent; bounds a host that never returns a draft. */
	rounds: number;
	facts: DraftFacts;
}

/** The composer actions a slot component receives. */
export interface InputActions {
	setDraft?: (draft: string) => void;
}

/** The framework shares a slot component hands to the store. */
export interface SessionScope {
	sessionId?: string;
	inputActions?: InputActions;
}

/** The store handle both components use. */
export interface FlowStore {
	getSnapshot(): FlowState;
	subscribe(listener: () => void): () => void;
	bind(scope: SessionScope): void;
	start(): void;
	pickChip(label: string): void;
	setChipOther(text: string): void;
	openChipOther(open: boolean): void;
	submitChipOther(): void;
	toggleAnswer(questionId: string, label: string, next: boolean): void;
	setFreeText(questionId: string, text: string): void;
	submitAnswers(): void;
	skipQuestions(): void;
	cancel(): void;
	dismiss(): void;
	restore(): void;
	sync(facts: DraftFacts): void;
}

/** Empty draft facts, used before the first sync. */
const NO_FACTS: DraftFacts = { draft: "", draftRev: 0, phase: "plain", refCount: 0, attachmentCount: 0 };

/**
 * Build one Session's store.
 * @param sessionId - Session identity, threaded to the host for route resolution.
 * @returns the store handle.
 */
export function createFlowStore(sessionId: string | undefined): FlowStore {
	let scope: SessionScope = { sessionId };
	let listeners: Array<() => void> = [];
	let inFlight: AbortController | null = null;
	let noticeTimer: ReturnType<typeof setTimeout> | null = null;

	const state: FlowState = {
		status: "idle",
		baselineDraft: "",
		reason: "",
		chips: [],
		questions: [],
		answers: {},
		freeText: {},
		chipOther: "",
		chipOtherOpen: false,
		issues: [],
		assumptions: [],
		writtenDraft: null,
		errorCode: "",
		errorMessage: "",
		rounds: 0,
		facts: NO_FACTS
	};

	// React compares successive getSnapshot() results with Object.is, so the
	// published value must be a new object whenever anything changed.
	let snapshot: FlowState = Object.freeze({ ...state });
	const publish = (): void => {
		snapshot = Object.freeze({ ...state });
	};

	let emitting = false;
	let pending = false;
	const emit = (): void => {
		if (emitting) {
			pending = true;
			return;
		}
		publish();
		emitting = true;
		try {
			do {
				pending = false;
				for (const listener of [...listeners]) listener();
			} while (pending);
		} finally {
			emitting = false;
		}
	};

	/** Merge a change and notify, in that order. */
	const patch = (next: Partial<FlowState>): void => {
		Object.assign(state, next);
		emit();
	};

	const clearNoticeTimer = (): void => {
		if (noticeTimer !== null) clearTimeout(noticeTimer);
		noticeTimer = null;
	};

	/** Drop the in-flight request; its late settlement then finds a new status. */
	const abortInFlight = (): void => {
		const controller = inFlight;
		inFlight = null;
		if (controller === null) return;
		try {
			controller.abort();
		} catch {
			/* already settled */
		}
	};

	/** Write the draft through the composer, exactly once per accepted rewrite. */
	const writeDraft = (draft: string): void => {
		scope.inputActions?.setDraft?.(draft);
	};

	/**
	 * POST one stage.
	 * @param payload - request body.
	 * @returns the parsed body, or a transport failure.
	 */
	const post = async (payload: EnhanceRequest): Promise<EnhanceResult> => {
		const controller = new AbortController();
		inFlight = controller;
		try {
			const response = await fetch(ROUTE, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
				signal: controller.signal
			});
			inFlight = null;
			if (!response.ok) return { ok: false, reason: "network", message: `HTTP ${response.status}` };
			return await response.json() as EnhanceResult;
		} catch (cause) {
			inFlight = null;
			if (cause !== null && typeof cause === "object" && (cause as { name?: unknown }).name === "AbortError") {
				return { ok: false, reason: "aborted" };
			}
			return { ok: false, reason: "network", message: cause instanceof Error ? cause.message : String(cause) };
		}
	};

	/** Land a finished rewrite: state first, so the write cannot dismiss itself. */
	const acceptDraft = (draft: string, result: EnhanceResult): void => {
		patch({
			status: "done",
			writtenDraft: draft,
			issues: normalizeIssues(result.issues),
			assumptions: normalizeAssumptions(result.assumptions),
			chips: [],
			questions: [],
			reason: "",
			errorCode: "",
			errorMessage: "",
			chipOther: "",
			chipOtherOpen: false
		});
		writeDraft(draft);
	};

	const fail = (code: string, message: string): void => {
		patch({
			status: "failed",
			errorCode: code,
			errorMessage: message,
			chips: [],
			questions: [],
			reason: ""
		});
	};

	/**
	 * Route one fast response: a rewrite lands, a gate opens, anything else fails.
	 * @param result - response body.
	 * @param baseline - draft the request was built from.
	 * @returns what the response turned into, for callers that may retry once.
	 */
	const settle = (result: EnhanceResult, baseline: string): "landed" | "gated" | "failed" => {
		if (result.ok !== true) {
			fail(result.reason ?? "internal", result.message ?? "");
			return "failed";
		}
		const draft = typeof result.draft === "string" ? result.draft : "";
		if (draft.trim() !== "") {
			acceptDraft(draft, result);
			return "landed";
		}
		const gate = normalizeGate(result.gate);
		if (gate.shape === "chips" && (gate.chips?.length ?? 0) > 0 && state.rounds < MAX_GATE_ROUNDS) {
			patch({
				status: "chips",
				reason: gate.reason ?? "",
				chips: gate.chips ?? [],
				questions: [],
				answers: {},
				freeText: {},
				chipOther: "",
				chipOtherOpen: false,
				rounds: state.rounds + 1
			});
			return "gated";
		}
		if (gate.shape === "panel" && (gate.questions?.length ?? 0) > 0 && state.rounds < MAX_GATE_ROUNDS) {
			patch({
				status: "panel",
				reason: gate.reason ?? "",
				chips: [],
				questions: gate.questions ?? [],
				answers: {},
				freeText: {},
				rounds: state.rounds + 1
			});
			return "gated";
		}
		if (gate.shape === "chips" || gate.shape === "panel") {
			// The host is expected to answer an answered request with a rewrite, so
			// this is a bug signal rather than a normal path: report it, do not loop.
			console.warn(`[dsh-composer-enhance] gate repeated past ${MAX_GATE_ROUNDS} rounds without a draft`, {
				baselineLength: baseline.length,
				shape: gate.shape
			});
			fail("empty-result", "");
			return "failed";
		}
		fail("empty-result", "");
		return "failed";
	};

	/**
	 * One answered round: send the choice, then land whatever comes back.
	 * @param answers - the picked labels, keyed by question id.
	 * @param questions - the question echo the protocol defines for this round.
	 * @returns the settled outcome, or `cancelled` when the run was abandoned.
	 */
	const runAnswered = async (
		answers: Record<string, string[]>,
		questions: GateQuestion[]
	): Promise<"landed" | "gated" | "failed" | "cancelled"> => {
		const baseline = state.baselineDraft;
		patch({ status: "writing", answers, questions, errorCode: "", errorMessage: "" });
		const result = await post({
			sessionId: scope.sessionId ?? "",
			stage: "fast",
			draft: baseline,
			baselineDraft: baseline,
			questions,
			answers
		});
		if (state.status !== "writing" || state.baselineDraft !== baseline) return "cancelled";
		return settle(result, baseline);
	};

	const start = async (): Promise<void> => {
		if (state.status === "gating" || state.status === "writing") return;
		const draft = state.facts.draft;
		if (draft.trim() === "") return;
		if (state.facts.phase !== "plain" || state.facts.refCount > 0) return;
		abortInFlight();
		clearNoticeTimer();
		patch({
			status: "gating",
			baselineDraft: draft,
			reason: "",
			chips: [],
			questions: [],
			answers: {},
			freeText: {},
			chipOther: "",
			chipOtherOpen: false,
			issues: [],
			assumptions: [],
			writtenDraft: null,
			errorCode: "",
			errorMessage: "",
			rounds: 0
		});
		const result = await post({
			sessionId: scope.sessionId ?? "",
			stage: "fast",
			draft,
			questions: [],
			answers: {}
		});
		if (state.status !== "gating" || state.baselineDraft !== draft) return;
		settle(result, draft);
	};

	const stillOnBaseline = (): boolean => state.facts.draft === state.baselineDraft;

	const pickChip = async (label: string): Promise<void> => {
		if (state.status !== "chips") return;
		if (!stillOnBaseline()) {
			cancel();
			return;
		}
		// The chips row the user answered, captured before any retry can replace it.
		const answered = { chips: state.chips, reason: state.reason };
		const answers = { [CHIPS_ANSWER_KEY]: [label] };
		// First attempt is the protocol's literal shape: the choice in `answers`,
		// no fabricated question echo.
		const outcome = await runAnswered(answers, []);
		if (outcome !== "gated" || state.status !== "chips" || !stillOnBaseline()) return;
		// The live host re-gated that shape (measured 2026-09-22: `questions: []`
		// plus non-empty `answers` comes back as another `shape:"chips"` gate, so
		// the pick could never land). Retrying once with the row echoed as a
		// question does skip the gate. Warn, because a host that needs this is a
		// host bug: protocol.md says a non-empty `answers` alone must skip it.
		console.warn("[dsh-composer-enhance] host re-gated a chips answer sent without a questions echo; retrying with the echo", {
			label,
			chips: answered.chips.map((chip) => chip.label)
		});
		await runAnswered(answers, chipQuestionEcho(answered.chips, answered.reason));
	};

	const submitChipOther = async (): Promise<void> => {
		const text = state.chipOther.trim();
		if (text === "") return;
		await pickChip(text);
	};

	const submitAnswers = async (): Promise<void> => {
		if (state.status !== "panel") return;
		if (!stillOnBaseline()) {
			cancel();
			return;
		}
		const answers: Record<string, string[]> = {};
		for (const question of state.questions) {
			const free = (state.freeText[question.id] ?? "").trim();
			if (free !== "") {
				answers[question.id] = [free];
				continue;
			}
			const picked = state.answers[question.id];
			if (Array.isArray(picked) && picked.length > 0) answers[question.id] = [...picked];
		}
		await runAnswered(answers, state.questions);
	};

	const skipQuestions = async (): Promise<void> => {
		if (state.status !== "panel") return;
		await runAnswered({}, state.questions);
	};

	/** Drop the flow entirely: no draft write, no further model call. */
	const cancel = (): void => {
		clearNoticeTimer();
		abortInFlight();
		patch({
			status: "idle",
			reason: "",
			chips: [],
			questions: [],
			answers: {},
			freeText: {},
			chipOther: "",
			chipOtherOpen: false,
			issues: [],
			assumptions: [],
			writtenDraft: null,
			errorCode: "",
			errorMessage: "",
			rounds: 0
		});
	};

	/** Drop a finished or failed run's notice, leaving the draft alone. */
	const dismiss = (): void => {
		clearNoticeTimer();
		patch({
			status: "idle",
			issues: [],
			assumptions: [],
			writtenDraft: null,
			errorCode: "",
			errorMessage: "",
			reason: "",
			rounds: 0
		});
	};

	/** Put back the draft text this run replaced. */
	const restore = (): void => {
		const previous = state.baselineDraft;
		clearNoticeTimer();
		patch({
			status: "idle",
			issues: [],
			assumptions: [],
			writtenDraft: null,
			errorCode: "",
			errorMessage: "",
			reason: "",
			rounds: 0
		});
		writeDraft(previous);
	};

	return {
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.push(listener);
			return () => {
				listeners = listeners.filter((entry) => entry !== listener);
			};
		},
		bind(next) {
			scope = next;
		},
		start: () => {
			void start();
		},
		pickChip: (label) => {
			void pickChip(label);
		},
		setChipOther: (text) => patch({ chipOther: text }),
		openChipOther: (open) => patch({ chipOtherOpen: open, chipOther: open ? state.chipOther : "" }),
		submitChipOther: () => {
			void submitChipOther();
		},
		toggleAnswer: (questionId, label, next) => {
			const current = state.answers[questionId] ?? [];
			const updated = next
				? [...current.filter((entry) => entry !== label), label]
				: current.filter((entry) => entry !== label);
			const answers = { ...state.answers };
			if (updated.length === 0) delete answers[questionId];
			else answers[questionId] = updated;
			patch({ answers });
		},
		setFreeText: (questionId, text) => patch({ freeText: { ...state.freeText, [questionId]: text } }),
		submitAnswers: () => {
			void submitAnswers();
		},
		skipQuestions: () => {
			void skipQuestions();
		},
		cancel,
		dismiss,
		restore,
		sync(facts) {
			const previous = state.facts;
			const unchanged = previous.draft === facts.draft
				&& previous.draftRev === facts.draftRev
				&& previous.phase === facts.phase
				&& previous.refCount === facts.refCount
				&& previous.attachmentCount === facts.attachmentCount;
			if (unchanged) return;
			state.facts = facts;
			// A draft that differs from what we wrote means the user has taken over,
			// so the change list (and its restore) retires.
			if (state.status === "done" && state.writtenDraft !== null && facts.draft !== state.writtenDraft) {
				dismiss();
				return;
			}
			// The draft is the single source of truth: any edit away from the
			// baseline abandons the run, in flight or waiting on answers.
			const live = state.status === "gating" || state.status === "writing"
				|| state.status === "chips" || state.status === "panel";
			if (live && facts.draft !== state.baselineDraft) {
				cancel();
				return;
			}
			emit();
		}
	};
}

/** One store per Session, so both slots share a flow. */
const stores = new Map<string, FlowStore>();

/**
 * Resolve a Session's store, creating it on first use.
 * @param sessionId - Session identity, or undefined before one is bound.
 * @returns the store handle.
 */
export function storeFor(sessionId: string | undefined): FlowStore {
	const key = typeof sessionId === "string" && sessionId !== "" ? sessionId : "__nosession__";
	let store = stores.get(key);
	if (store === undefined) {
		store = createFlowStore(sessionId);
		stores.set(key, store);
	}
	return store;
}
