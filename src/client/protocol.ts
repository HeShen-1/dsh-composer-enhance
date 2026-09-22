/**
 * Wire contract shared with the host half.
 *
 * This file is a transcription of `docs/protocol.md`; that document is the
 * source of truth and is changed first. Everything the client sends or reads
 * over the route is typed here so the shapes cannot drift apart silently.
 */

/** The one route this plugin talks to. */
export const ROUTE = "/dsh-composer-enhance/enhance";

/** Chips in one row (protocol constants table). */
export const MAX_CHIPS = 4;

/** Questions in one panel. */
export const MAX_QUESTIONS = 3;

/** Options per question. */
export const MAX_OPTIONS = 5;

/**
 * Key a chips pick is answered under.
 *
 * The `chips` shape carries no question id of its own, so the pick travels as
 * `answers: { "chips": [label] }` with an empty `questions` echo. The host
 * branches on `questions.length === 0` and flattens `answers` into the
 * "user's choice" paragraph it feeds the rewrite; Lead confirmed the key.
 */
export const CHIPS_ANSWER_KEY = "chips";

/**
 * Gate rounds the client accepts before it stops asking. The protocol fixes no
 * bound; without one a host that keeps answering `shape:chips` and never
 * returns a draft would loop forever.
 */
export const MAX_GATE_ROUNDS = 2;

/** Gate shapes the host may answer with. */
export type GateShape = "chips" | "panel" | "none";

/** Change-list kinds the result bar labels. */
export type IssueKind = "added" | "clarified" | "restructured" | "assumption";

/** One chip: a one-tap answer with no typing. */
export interface ChipOption {
	label: string;
}

/** One selectable answer inside a question. */
export interface QuestionOption {
	label: string;
	description?: string;
	recommended?: boolean;
}

/** One clarifying question. */
export interface GateQuestion {
	id: string;
	header?: string;
	question: string;
	options?: QuestionOption[];
}

/** The gate block every fast response carries. */
export interface Gate {
	hasAmbiguity?: boolean;
	ambiguityType?: string;
	reason?: string;
	shape?: GateShape;
	chips?: ChipOption[];
	questions?: GateQuestion[];
}

/** One line of the change list. */
export interface Issue {
	kind?: string;
	text?: string;
}

/** Request body. */
export interface EnhanceRequest {
	sessionId: string;
	stage: "fast" | "slow";
	draft: string;
	baselineDraft?: string;
	questions?: GateQuestion[];
	answers?: Record<string, string[]>;
	options?: { includeMemory: boolean };
}

/** Response body, success and failure flattened into one shape. */
export interface EnhanceResult {
	ok?: boolean;
	reason?: string;
	message?: string;
	stage?: string;
	gate?: Gate;
	draft?: unknown;
	issues?: unknown;
	assumptions?: unknown;
	contextUsed?: unknown;
	route?: { provider?: string; model?: string; reasoningEffort?: string };
}

/** Failure reason codes the protocol names, plus the two the client invents. */
export type FailureCode =
	| "no-route"
	| "bad-request"
	| "model-error"
	| "empty-result"
	| "stale"
	| "network"
	| "aborted"
	| "internal";

/** Coerce a chip list to the protocol cap, dropping entries without a label. */
export function normalizeChips(value: unknown): ChipOption[] {
	if (!Array.isArray(value)) return [];
	const chips: ChipOption[] = [];
	for (const entry of value) {
		if (entry === null || typeof entry !== "object") continue;
		const label = (entry as { label?: unknown }).label;
		if (typeof label !== "string" || label.trim() === "") continue;
		chips.push({ label });
		if (chips.length >= MAX_CHIPS) break;
	}
	return chips;
}

/** Coerce a question list to the protocol caps. */
export function normalizeQuestions(value: unknown): GateQuestion[] {
	if (!Array.isArray(value)) return [];
	const questions: GateQuestion[] = [];
	for (const entry of value) {
		if (entry === null || typeof entry !== "object") continue;
		const raw = entry as { id?: unknown; header?: unknown; question?: unknown; options?: unknown };
		const question = typeof raw.question === "string" ? raw.question : "";
		if (question.trim() === "") continue;
		const options: QuestionOption[] = [];
		if (Array.isArray(raw.options)) {
			for (const option of raw.options) {
				if (option === null || typeof option !== "object") continue;
				const label = (option as { label?: unknown }).label;
				if (typeof label !== "string" || label.trim() === "") continue;
				const description = (option as { description?: unknown }).description;
				options.push({
					label,
					description: typeof description === "string" ? description : undefined,
					recommended: (option as { recommended?: unknown }).recommended === true
				});
				if (options.length >= MAX_OPTIONS) break;
			}
		}
		questions.push({
			id: typeof raw.id === "string" && raw.id !== "" ? raw.id : `q${questions.length + 1}`,
			header: typeof raw.header === "string" ? raw.header : undefined,
			question,
			options
		});
		if (questions.length >= MAX_QUESTIONS) break;
	}
	return questions;
}

/** Read the gate block, tolerating an absent one (a stub or an M1 host). */
export function normalizeGate(value: unknown): Gate {
	if (value === null || typeof value !== "object") return { shape: "none" };
	const raw = value as Record<string, unknown>;
	return {
		hasAmbiguity: raw.hasAmbiguity === true,
		ambiguityType: typeof raw.ambiguityType === "string" ? raw.ambiguityType : undefined,
		reason: typeof raw.reason === "string" ? raw.reason : "",
		shape: raw.shape === "chips" || raw.shape === "panel" || raw.shape === "none" ? raw.shape : undefined,
		chips: normalizeChips(raw.chips),
		questions: normalizeQuestions(raw.questions)
	};
}

/** Read the change list, dropping entries with no text. */
export function normalizeIssues(value: unknown): Issue[] {
	if (!Array.isArray(value)) return [];
	const issues: Issue[] = [];
	for (const entry of value) {
		if (entry === null || typeof entry !== "object") continue;
		const raw = entry as { kind?: unknown; text?: unknown };
		if (typeof raw.text !== "string" || raw.text.trim() === "") continue;
		issues.push({ kind: typeof raw.kind === "string" ? raw.kind : "clarified", text: raw.text });
	}
	return issues;
}

/** Read the assumption list. */
export function normalizeAssumptions(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "");
}

/**
 * The question echo a chips pick is sent with.
 *
 * Measured against the live host: `questions: []` plus a non-empty `answers`
 * does NOT skip the gate — the host answers with another `shape:"chips"` gate
 * and the flow can never land. A non-empty `questions` array does skip it and
 * the answer reaches the rewrite. So the pick echoes the row it answered, with
 * the chips as that question's options.
 * @param chips - the chips that were shown.
 * @param reason - the gate's one-line reason, used as the question text.
 * @returns the one-question echo.
 */
export function chipQuestionEcho(chips: ChipOption[], reason: string): GateQuestion[] {
	return [{
		id: CHIPS_ANSWER_KEY,
		header: "clarify",
		question: reason !== "" ? reason : chips.map((chip) => chip.label).join(" / "),
		options: chips.map((chip) => ({ label: chip.label }))
	}];
}
