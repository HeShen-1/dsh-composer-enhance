/**
 * The plugin's React surfaces: the ✨ button, the dock (chips, question panel,
 * progress, failure, change list), and the next-message suggestion row.
 *
 * Every control is a shipped primitive — `Button`, `Pill`, `Checkbox`, `Input`,
 * `Tag`, `Tooltip` and the shipped icons — so hover, focus, keyboard and theme
 * behaviour come from the design system instead of from local artwork.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { TagTone } from "@deepseek-ai/dsh-client-ui-primitives";
import {
	Button,
	Checkbox,
	IconCloseOutlineRegular,
	IconLoadingOutlineRegular,
	IconSparkleRegular,
	IconWarningOutlineRegular,
	Input,
	Pill,
	Tag,
	Tooltip
} from "@deepseek-ai/dsh-client-ui-primitives";

import { storeFor, type FlowState, type FlowStore, type InputActions } from "./store";
import type { Issue } from "./protocol";

/** Draft facts the composer publishes to slot components. */
interface InputState {
	draft: string;
	draftRev: number;
	phase: string;
	occurrences?: unknown[];
	attachmentIds?: string[];
}

/** A subscribable snapshot source, matching `useSyncExternalStore`. */
export interface Store<T> {
	subscribe(listener: () => void): () => void;
	getSnapshot(): T;
}

/** The Session lifecycle facts the suggestion trigger reads. */
export interface SessionFacts {
	running?: boolean;
	blank?: boolean;
}

/** Framework props handed to a slot occupant, plus the wrapper's locale store. */
export interface SlotProps {
	sessionId?: string;
	inputActions?: InputActions;
	useInput<T>(selector: (value: InputState) => T): T;
	/** Session-scope standard prop: lifecycle/control state of the current Session. */
	useSession?<T>(selector: (value: SessionFacts) => T): T;
	__localeStore?: Store<string>;
}

/** BCP-47 test for the locales this build addresses in Chinese. */
const CJK_RE = /^zh\b|^zh-|-hans\b|-hant\b/iu;

/**
 * One locale's copy table.
 *
 * Declared as an interface rather than inferred from the Chinese table: with
 * `typeof COPY.zh` the English strings are a different literal type and the
 * table stops being assignable to its own lookup result.
 */
interface Copy {
	enhance: string;
	analyzing: string;
	writing: string;
	empty: string;
	locked: string;
	references: string;
	clarifying: string;
	enhanced: string;
	restore: string;
	close: string;
	cancel: string;
	skip: string;
	apply: string;
	needConfirm: string;
	writeOwn: string;
	otherHint: string;
	freeHint: string;
	recommended: string;
	failed: string;
	assumptions: string;
	/** The slow review's offer line, with its change count. */
	slowOffer: (count: number) => string;
	slowApply: string;
	restoreFast: string;
	/** Next-message suggestion row. */
	suggestPrefix: string;
	suggestAccept: string;
	suggestDismiss: string;
	kinds: Record<string, string>;
	reasons: Record<string, string>;
}

const COPY: Record<"en" | "zh", Copy> = {
	en: {
		enhance: "Enhance prompt",
		analyzing: "Reading the draft…",
		writing: "Rewriting…",
		empty: "Enhance prompt (write something first)",
		locked: "Enhance prompt (wait for the composer)",
		references: "Enhance prompt (the draft has @ references, which enhancing would drop)",
		clarifying: "Enhance prompt (answer the questions above first)",
		enhanced: "Enhanced",
		restore: "Restore original",
		close: "Close",
		cancel: "Cancel",
		skip: "Skip",
		apply: "Enhance",
		needConfirm: "Needs a decision",
		writeOwn: "Write my own",
		otherHint: "Other…",
		freeHint: "Or type your own answer",
		recommended: "Recommended",
		failed: "Enhance failed: ",
		assumptions: "Assumed: ",
		slowOffer: (count) => `A stricter version is available (${count} changes)`,
		slowApply: "Review & replace",
		restoreFast: "Restore fast version",
		suggestPrefix: "Suggestion: ",
		suggestAccept: "Use",
		suggestDismiss: "Dismiss suggestion",
		kinds: { added: "added", clarified: "clarified", restructured: "restructured", assumption: "assumption" },
		reasons: {
			"no-route": "no model route is available",
			"bad-request": "the request was rejected",
			"model-error": "the model call failed",
			"empty-result": "the model returned no rewrite",
			"stale": "the draft changed, so this run was dropped",
			network: "the request did not reach the host",
			aborted: "cancelled",
			internal: "internal error"
		}
	},
	zh: {
		enhance: "增强提示词",
		analyzing: "正在分析草稿…",
		writing: "正在改写…",
		empty: "增强提示词（先写点东西）",
		locked: "增强提示词（等输入框可用）",
		references: "增强提示词（草稿里有 @ 引用，增强会丢掉引用气泡）",
		clarifying: "增强提示词（先处理上面的问题）",
		enhanced: "已增强",
		restore: "还原原文",
		close: "关闭",
		cancel: "取消",
		skip: "跳过",
		apply: "增强",
		needConfirm: "需要确认",
		writeOwn: "自己写",
		otherHint: "其它…",
		freeHint: "或直接写你的答案",
		recommended: "推荐",
		failed: "增强失败：",
		assumptions: "假设：",
		slowOffer: (count) => `更严格的版本可用（改了 ${count} 处）`,
		slowApply: "查看/替换",
		restoreFast: "还原到快轨版",
		suggestPrefix: "建议：",
		suggestAccept: "采用",
		suggestDismiss: "关闭建议",
		kinds: { added: "新增", clarified: "明确", restructured: "重组", assumption: "假设" },
		reasons: {
			"no-route": "没有可用的模型路由",
			"bad-request": "请求不合法",
			"model-error": "模型调用失败",
			"empty-result": "模型没有给出改写结果",
			"stale": "草稿已改动，本次增强作废",
			network: "请求没有到达 host",
			aborted: "已取消",
			internal: "内部错误"
		}
	}
};

/** Tone and label for each change-list kind. */
const KIND_TONE: Record<string, TagTone> = {
	added: "info",
	clarified: "neutral",
	restructured: "warning",
	assumption: "quiet"
};

/**
 * Subscribe a slot component to its Session store and publish draft facts.
 * @param props - framework props of the slot occupant.
 * @returns the store, its state, and the active copy table.
 */
export function useFlow(props: SlotProps): { store: FlowStore; state: FlowState; t: Copy } {
	// The locale service arrives through one wrapper prop; hold the first
	// reference so a fresh identity per render cannot churn the subscriptions.
	const [localeStore] = useState(() => props.__localeStore);
	const store = storeFor(props.sessionId);
	// Bare getters, no `this`: React calls them unbound.
	const state = useSyncExternalStore(
		useCallback((listener: () => void) => store.subscribe(listener), [store]),
		useCallback(() => store.getSnapshot(), [store])
	);
	const locale = useSyncExternalStore(
		useCallback((listener: () => void) => localeStore?.subscribe(listener) ?? (() => {}), [localeStore]),
		useCallback(() => localeStore?.getSnapshot() ?? "", [localeStore])
	);
	const t: Copy = CJK_RE.test(locale) ? COPY.zh : COPY.en;

	const draft = props.useInput((value) => value.draft);
	const draftRev = props.useInput((value) => value.draftRev);
	const phase = props.useInput((value) => value.phase);
	const refCount = props.useInput((value) => value.occurrences?.length ?? 0);
	const attachmentCount = props.useInput((value) => value.attachmentIds?.length ?? 0);

	store.bind({ sessionId: props.sessionId, inputActions: props.inputActions });

	useEffect(() => {
		store.sync({ draft, draftRev, phase, refCount, attachmentCount });
	}, [store, draft, draftRev, phase, refCount, attachmentCount]);

	// The dependency list is load-bearing: with no list React would run this
	// cleanup after EVERY render, cancelling the flow the moment it starts.
	useEffect(() => () => {
		store.cancel();
		store.suspend();
	}, [store]);

	return { store, state, t };
}

/**
 * The reason the ✨ button refuses to run, or an empty string when it may.
 * @param state - flow state.
 * @param facts - current draft facts.
 * @param t - copy table.
 * @returns the tooltip label.
 */
function blockedReason(
	state: FlowState,
	facts: { draft: string; phase: string; refCount: number },
	t: Copy
): string {
	if (state.status === "gating") return t.analyzing;
	if (state.status === "writing") return t.writing;
	if (facts.refCount > 0) return t.references;
	if (facts.draft.trim() === "") return t.empty;
	if (facts.phase !== "plain") return t.locked;
	if (state.status === "chips" || state.status === "panel") return t.clarifying;
	return "";
}

/**
 * The ✨ button that starts a run.
 * @param props - framework props of the `conversation.input.right` slot.
 * @returns the button element.
 */
export function EnhanceButton(props: SlotProps) {
	const { store, state, t } = useFlow(props);
	const draft = props.useInput((value) => value.draft);
	const phase = props.useInput((value) => value.phase);
	const refCount = props.useInput((value) => value.occurrences?.length ?? 0);
	const busy = state.status === "gating" || state.status === "writing";
	const blocked = blockedReason(state, { draft, phase, refCount }, t);
	const disabled = busy || blocked !== "";
	const label = blocked !== "" ? blocked : t.enhance;

	return (
		<Tooltip label={label} side="top" delayMs={400}>
			<Button
				variant="ghost"
				size="sm"
				type="button"
				icon={<IconSparkleRegular size={14} />}
				aria-label={label}
				aria-busy={busy ? "true" : undefined}
				data-dshce="button"
				disabled={disabled}
				onMouseDown={(event) => event.preventDefault()}
				onClick={() => store.start()}
			/>
		</Tooltip>
	);
}

/**
 * One change-list row: a kind tag plus the change itself.
 * @param props.issue - the change list entry.
 * @param props.t - copy table.
 */
function IssueRow({ issue, t }: { issue: Issue; t: Copy }) {
	const kind = issue.kind ?? "clarified";
	const known = kind === "added" || kind === "clarified" || kind === "restructured" || kind === "assumption";
	const label = known ? t.kinds[kind] : kind;
	return (
		<li className="dshce-issue">
			<Tag tone={known ? KIND_TONE[kind] : "outline"} className="dshce-kind">{label}</Tag>
			<span>{issue.text}</span>
		</li>
	);
}

/** The close (✕) control every card shares. */
function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<Button
			variant="ghost"
			size="sm"
			type="button"
			icon={<IconCloseOutlineRegular size={14} />}
			aria-label={label}
			data-dshce="close"
			onClick={onClick}
		/>
	);
}

/**
 * A finished run: what changed, what was assumed, and the way back.
 * @param props.state - flow state.
 * @param props.t - copy table.
 * @param props.onRestore - write the pre-run draft back.
 * @param props.onRestoreFast - put the fast result back after a slow replacement.
 * @param props.onApplySlow - take the slower version the offer line holds.
 * @param props.onDismissSlow - hide the offer line without touching the draft.
 * @param props.onClose - retire the notice.
 */
function ResultBar(
	{ state, t, onRestore, onRestoreFast, onApplySlow, onDismissSlow, onClose }: {
		state: FlowState;
		t: Copy;
		onRestore: () => void;
		onRestoreFast: () => void;
		onApplySlow: () => void;
		onDismissSlow: () => void;
		onClose: () => void;
	}
) {
	return (
		<div className="dshce-card" data-dshce="result" data-slow={state.slowPhase}>
			<div className="dshce-body">
				<div className="dshce-row">
					<span className="dshce-lead"><IconSparkleRegular size={14} /></span>
					<span className="dshce-title">{t.enhanced}</span>
					<span className="dshce-spacer" />
					{state.slowPhase === "applied"
						? (
							<Button
								variant="ghost"
								size="sm"
								type="button"
								data-dshce="restore-fast"
								onClick={onRestoreFast}
							>
								{t.restoreFast}
							</Button>
						)
						: null}
					<Button variant="outline" size="sm" type="button" data-dshce="restore" onClick={onRestore}>
						{t.restore}
					</Button>
					<CloseButton label={t.close} onClick={onClose} />
				</div>
				{state.issues.length > 0
					? (
						<ul className="dshce-list">
							{state.issues.map((issue, index) => (
								<IssueRow key={`${issue.kind ?? "k"}:${index}`} issue={issue} t={t} />
							))}
						</ul>
					)
					: null}
				{state.assumptions.length > 0
					? (
						<ul className="dshce-assumptions">
							{state.assumptions.map((assumption, index) => (
								<li key={`a:${index}`}>{`${t.assumptions}${assumption}`}</li>
							))}
						</ul>
					)
					: null}
				{state.slowPhase === "offered" && state.slowDraft !== null
					? (
						// The slow review landed outside its safety valves, so the draft
						// stays untouched and the stricter text waits behind a click.
						<div className="dshce-offer" data-dshce="slow-offer">
							<span className="dshce-offerText">{t.slowOffer(state.slowCount)}</span>
							<span className="dshce-spacer" />
							<Button
								variant="outline"
								size="sm"
								type="button"
								data-dshce="slow-apply"
								onClick={onApplySlow}
							>
								{t.slowApply}
							</Button>
							<CloseButton label={t.close} onClick={onDismissSlow} />
						</div>
					)
					: null}
			</div>
		</div>
	);
}

/**
 * A gate that can be answered with one tap.
 * @param props.state - flow state.
 * @param props.t - copy table.
 * @param props.store - flow store.
 */
function ChipsRow({ state, t, store }: { state: FlowState; t: Copy; store: FlowStore }) {
	return (
		<div className="dshce-card" data-dshce="chips">
			<div className="dshce-body">
				<div className="dshce-row">
					<span className="dshce-lead"><IconSparkleRegular size={14} /></span>
					<span className="dshce-sub" title={state.reason}>{state.reason}</span>
					<CloseButton label={t.cancel} onClick={() => store.cancel()} />
				</div>
				<div className="dshce-chips" role="group" aria-label={t.needConfirm}>
					{state.chips.map((chip) => (
						<Pill
							key={chip.label}
							type="button"
							title={chip.label}
							data-dshce="chip"
							onClick={() => store.pickChip(chip.label)}
						>
							{chip.label}
						</Pill>
					))}
					{state.chipOtherOpen
						? (
							<Input
								className="dshce-chipOther"
								autoFocus
								value={state.chipOther}
								placeholder={t.otherHint}
								aria-label={t.writeOwn}
								onChange={(event) => store.setChipOther(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter") store.submitChipOther();
									if (event.key === "Escape") store.openChipOther(false);
								}}
							/>
						)
						: (
							<Pill type="button" data-dshce="chip-other" onClick={() => store.openChipOther(true)}>
								{t.writeOwn}
							</Pill>
						)}
				</div>
			</div>
		</div>
	);
}

/**
 * The multi-question gate. Each question takes checkboxes plus a free-text row.
 * @param props.state - flow state.
 * @param props.t - copy table.
 * @param props.store - flow store.
 */
function QuestionPanel({ state, t, store }: { state: FlowState; t: Copy; store: FlowStore }) {
	return (
		<div className="dshce-card" data-dshce="panel">
			<div className="dshce-body dshce-bodyScroll">
				<div className="dshce-row">
					<span className="dshce-lead"><IconSparkleRegular size={14} /></span>
					<span className="dshce-title">{t.needConfirm}</span>
					<span className="dshce-sub" title={state.reason}>{state.reason}</span>
					<CloseButton label={t.cancel} onClick={() => store.cancel()} />
				</div>
				{state.questions.map((question) => {
					const selected = state.answers[question.id] ?? [];
					return (
						<div className="dshce-question" key={question.id} data-dshce="question">
							{question.header !== undefined && question.header !== ""
								? <span className="dshce-qhead">{question.header}</span>
								: null}
							<p className="dshce-qtext">{question.question}</p>
							<div className="dshce-options">
								{(question.options ?? []).map((option) => (
									<div className="dshce-option" key={option.label}>
										<Checkbox
											checked={selected.includes(option.label)}
											label={option.label}
											title={option.description}
											onChange={(next) => store.toggleAnswer(question.id, option.label, next)}
										/>
										{option.recommended === true ? <Tag tone="quiet">{t.recommended}</Tag> : null}
									</div>
								))}
							</div>
							<Input
								className="dshce-free"
								value={state.freeText[question.id] ?? ""}
								placeholder={t.freeHint}
								aria-label={question.question}
								data-dshce="free"
								onChange={(event) => store.setFreeText(question.id, event.target.value)}
							/>
						</div>
					);
				})}
			</div>
			<div className="dshce-foot">
				<Button variant="outline" size="sm" type="button" onClick={() => store.cancel()}>{t.cancel}</Button>
				<Button variant="ghost" size="sm" type="button" onClick={() => store.skipQuestions()}>{t.skip}</Button>
				<span className="dshce-spacer" />
				<Button
					variant="primary"
					size="sm"
					type="button"
					data-dshce="apply"
					onClick={() => store.submitAnswers()}
				>
					{t.apply}
				</Button>
			</div>
		</div>
	);
}

/**
 * One status line: a spinner while a request runs, a warning glyph on failure.
 * @param props.tone - busy or error.
 * @param props.text - line text.
 * @param props.t - copy table.
 * @param props.onClose - cancel the run, or retire the failure.
 */
function StatusLine(
	{ tone, text, t, onClose }: { tone: "busy" | "error"; text: string; t: Copy; onClose: () => void }
) {
	return (
		<div className="dshce-card" data-dshce="status" data-tone={tone}>
			<div className="dshce-body">
				<div className="dshce-row">
					{tone === "busy"
						? <span className="dshce-spin"><IconLoadingOutlineRegular size={14} /></span>
						: <span className="dshce-lead"><IconWarningOutlineRegular size={14} /></span>}
					<p className="dshce-status" data-tone={tone} role={tone === "error" ? "alert" : undefined}>{text}</p>
					<CloseButton label={tone === "busy" ? t.cancel : t.close} onClick={onClose} />
				</div>
			</div>
		</div>
	);
}

/**
 * Whether a composer popup owns the keyboard right now.
 *
 * The slash menu, command popup, feedback dialog, and model menu live inside
 * the composer card; while one is open Tab belongs to it. There is no public
 * "popup open" API, so this DOM probe is deliberately conservative: if it
 * cannot tell (no document), the caller must fail open and not intercept Tab.
 * @returns whether a popup appears to be open.
 */
function composerPopupOpen(): boolean {
	if (typeof document === "undefined") return true;
	return document.querySelector(
		'[data-composer-card] [role="listbox"], [data-composer-card] [role="menu"], '
		+ '[data-composer-card] [role="dialog"], [data-composer-card] [aria-expanded="true"][aria-haspopup]'
	) !== null;
}

/**
 * Best-effort keyboard return to the composer after a click accept.
 *
 * `InputActions` has no `focus()`; a mousedown `preventDefault` keeps focus in
 * the common case, and this fallback only runs when focus already left. Both
 * anchors are public: the shell's own `data-composer-card` and the standard
 * `contenteditable` attribute.
 */
function focusComposerIfNeeded(): void {
	if (typeof document === "undefined") return;
	const active = document.activeElement;
	if (active instanceof Element && active.closest("[data-composer-card]") !== null) return;
	const root = document.querySelector('[data-composer-card] [contenteditable="true"]');
	if (root instanceof HTMLElement) root.focus();
}

/**
 * The next-message suggestion row (P0 of the Web suggestion design).
 * @param props.text - the suggestion.
 * @param props.t - copy table.
 * @param props.onAccept - write it into the draft (one step, no send).
 * @param props.onDismiss - retire it and start the suppression clock.
 */
function SuggestionRow(
	{ text, t, onAccept, onDismiss }: { text: string; t: Copy; onAccept: () => void; onDismiss: () => void }
) {
	return (
		<div className="dshce-card dshce-suggest" data-dshce="suggest" role="status" aria-live="polite">
			<div className="dshce-body">
				<div className="dshce-row">
					<span className="dshce-lead"><IconSparkleRegular size={14} /></span>
					<span className="dshce-suggestText" title={text}>
						<span className="dshce-suggestLabel">{t.suggestPrefix}</span>{text}
					</span>
					<span className="dshce-spacer" />
					<Button
						variant="ghost"
						size="sm"
						type="button"
						aria-keyshortcuts="Tab"
						data-dshce="suggest-accept"
						onMouseDown={(event) => event.preventDefault()}
						onClick={onAccept}
					>
						{t.suggestAccept}<kbd className="dshce-kbd">Tab</kbd>
					</Button>
					<CloseButton label={t.suggestDismiss} onClick={onDismiss} />
				</div>
			</div>
		</div>
	);
}

/**
 * The dock occupant: whichever surface the current status calls for, or nothing.
 * @param props - framework props of the `conversation.input.dock` slot.
 * @returns the panel element, or null when the flow owns no dock space.
 */
export function EnhanceDock(props: SlotProps) {
	const { store, state, t } = useFlow(props);
	const status = state.status;

	// Session lifecycle drives the suggestion trigger: the running true→false
	// edge is "one turn ended", the only moment a next-message suggestion is
	// worth paying a model call for. `blank` keeps brand-new Sessions quiet.
	const running = props.useSession?.((value) => value.running === true) ?? false;
	const blank = props.useSession?.((value) => value.blank === true) ?? true;

	useEffect(() => {
		const visible = typeof document === "undefined" || document.visibilityState === "visible";
		store.observeIdle({ running, blank, visible });
	}, [store, running, blank, state.facts.draft, state.facts.draftRev, state.facts.phase, status]);

	useEffect(() => {
		if (typeof document === "undefined") return;
		const onVisibility = (): void => {
			store.observeIdle({ running, blank, visible: document.visibilityState === "visible" });
		};
		document.addEventListener("visibilitychange", onVisibility);
		return () => document.removeEventListener("visibilitychange", onVisibility);
	}, [store, running, blank]);

	const acceptSuggestion = useCallback((): void => {
		if (store.acceptSuggestion()) focusComposerIfNeeded();
	}, [store]);

	// Tab accepts only while the row is visible, the composer owns focus, no
	// popup is open, and the IME is not composing. A plain Tab cannot be
	// registered as a shell shortcut (reserved / modifier-required), so this is
	// the one keyboard path and every uncertain case fails open.
	useEffect(() => {
		if (state.suggestStatus !== "shown") return;
		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key !== "Tab" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
			if (event.isComposing || event.keyCode === 229) return;
			const active = document.activeElement;
			if (!(active instanceof Element) || active.closest("[data-composer-card]") === null) return;
			if (composerPopupOpen()) return;
			event.preventDefault();
			acceptSuggestion();
		};
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [state.suggestStatus, acceptSuggestion]);

	// Escape closes whatever the dock opened: the gate first, else the suggestion.
	useEffect(() => {
		if (status !== "chips" && status !== "panel" && state.suggestStatus !== "shown") return;
		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key !== "Escape") return;
			if (status === "chips" || status === "panel") store.cancel();
			else store.dismissSuggestion();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [status, state.suggestStatus, store]);

	if (status === "chips") return <ChipsRow state={state} t={t} store={store} />;
	if (status === "panel") return <QuestionPanel state={state} t={t} store={store} />;
	if (status === "gating") {
		return <StatusLine tone="busy" text={t.analyzing} t={t} onClose={() => store.cancel()} />;
	}
	if (status === "writing") {
		return <StatusLine tone="busy" text={t.writing} t={t} onClose={() => store.cancel()} />;
	}
	if (status === "failed") {
		const message = state.errorMessage !== ""
			? state.errorMessage
			: t.reasons[state.errorCode] ?? state.errorCode;
		return <StatusLine tone="error" text={`${t.failed}${message}`} t={t} onClose={() => store.dismiss()} />;
	}
	if (status === "done") {
		return (
			<ResultBar
				state={state}
				t={t}
				onRestore={() => store.restore()}
				onRestoreFast={() => store.restoreFast()}
				onApplySlow={() => store.applySlow()}
				onDismissSlow={() => store.dismissSlowOffer()}
				onClose={() => store.dismiss()}
			/>
		);
	}
	if (status === "idle" && state.suggestStatus === "shown") {
		return (
			<SuggestionRow
				text={state.suggestion}
				t={t}
				onAccept={acceptSuggestion}
				onDismiss={() => store.dismissSuggestion()}
			/>
		);
	}
	return null;
}
