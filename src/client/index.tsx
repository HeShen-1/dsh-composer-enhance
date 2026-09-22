/**
 * dsh-composer-enhance — browser half.
 *
 * M1 scope: the ✨ button itself, built the native way. Controls come from
 * `@deepseek-ai/dsh-client-ui-primitives` — including `IconSparkle16`, the
 * shipped sparkle glyph — so the control is the same object the rest of the
 * composer uses rather than a lookalike. The click posts to the host route and
 * writes the answer back through `inputActions.setDraft`, which proves the whole
 * round trip before any prompt engineering lands in M2.
 *
 * The module is a plain ES module in TypeScript; `scripts/build.mjs` wraps the
 * compiled CommonJS body in the `window.__ModuleLoader__.load` envelope, so the
 * shipped `lib/client.js` is the same artifact shape as a first-party bundle.
 */
import { useCallback, useState, useSyncExternalStore } from "react";
import type { JSX } from "react";

import {
	Button,
	IconSparkle16,
	Tooltip
} from "@deepseek-ai/dsh-client-ui-primitives";

/** Host route this button posts to. */
const ROUTE = "/dsh-composer-enhance/enhance";

/** Plugin id, also the label every slot registration carries. */
const PLUGIN_ID = "dsh-composer-enhance";

/** BCP-47 test for the locales this build addresses in Chinese. */
const CJK_RE = /^zh\b|^zh-|-hans\b|-hant\b/iu;

const COPY = {
	en: {
		enhance: "Enhance prompt",
		empty: "Enhance prompt (write something first)",
		locked: "Enhance prompt (wait for the composer)",
		busy: "Enhancing your prompt"
	},
	zh: {
		enhance: "增强提示词",
		empty: "增强提示词（先写点东西）",
		locked: "增强提示词（等输入框可用）",
		busy: "正在增强提示词"
	}
} as const;

type Copy = typeof COPY.en;

/** Draft facts the composer publishes to slot components. */
interface InputState {
	draft: string;
	draftRev: number;
	phase: string;
	occurrences: unknown[];
	attachmentIds: string[];
}

/** Draft-mutating actions the composer exposes to slot components. */
interface InputActions {
	setDraft?: (draft: string) => void;
}

/** Framework props handed to a `conversation.input.right` occupant. */
interface SlotProps {
	sessionId?: string;
	inputActions?: InputActions;
	useInput<T>(selector: (value: InputState) => T): T;
}

/** The slice of the `slots` service this plugin uses. */
interface SlotsService {
	inject(name: string, callback: () => void): void;
	register(descriptor: { name: string; id: string; order: number; label: string }, component: unknown): void;
}

/** A subscribable snapshot source, matching `useSyncExternalStore`. */
interface Store<T> {
	subscribe(listener: () => void): () => void;
	getSnapshot(): T;
}

/** Plugin context as the client tree exposes it. */
interface ClientContext {
	get(key: string): unknown;
}

/**
 * Read the page locale through the locale service, falling back to the browser's
 * own preference before that service has synced.
 * @param ctx - client plugin context.
 * @returns a store of the active locale tag.
 */
function localeStoreOf(ctx: ClientContext): Store<string> {
	const service = ctx.get("locale") as {
		subscribe?: (listener: () => void) => () => void;
		getSnapshot?: () => unknown;
	} | undefined;
	return {
		subscribe: (listener) => typeof service?.subscribe === "function" ? service.subscribe(listener) : () => {},
		getSnapshot: () => {
			const value = service?.getSnapshot?.();
			if (typeof value === "string") return value;
			// The locale service publishes `{ active, locales, revision }`.
			if (value !== null && typeof value === "object" && typeof (value as { active?: unknown }).active === "string") {
				const active = (value as { active: string }).active;
				if (active !== "") return active;
			}
			const nav = typeof navigator === "undefined" ? undefined : navigator.language;
			return typeof nav === "string" ? nav : "";
		}
	};
}

/**
 * The ✨ button.
 * @param props - framework props of the `conversation.input.right` slot.
 * @returns the button element.
 */
function EnhanceButton(props: SlotProps & { __locale?: Store<string> }): JSX.Element {
	const localeStore = props.__locale;
	const locale = useSyncExternalStore(
		useCallback((listener: () => void) => localeStore?.subscribe(listener) ?? (() => {}), [localeStore]),
		useCallback(() => localeStore?.getSnapshot() ?? "", [localeStore])
	);
	const t: Copy = CJK_RE.test(locale) ? COPY.zh : COPY.en;

	const draft = props.useInput((value) => value.draft);
	const phase = props.useInput((value) => value.phase);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	const empty = draft.trim() === "";
	const disabled = busy || empty || phase !== "plain";
	const label = error !== "" ? `${t.enhance} — ${error}`
		: busy ? t.busy
			: empty ? t.empty
				: phase !== "plain" ? t.locked
					: t.enhance;

	const onClick = useCallback(() => {
		if (disabled) return;
		setBusy(true);
		setError("");
		void (async () => {
			try {
				const response = await fetch(ROUTE, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ draft, sessionId: props.sessionId })
				});
				const result = await response.json() as { ok?: boolean; draft?: unknown; message?: unknown; reason?: unknown };
				if (result.ok !== true) {
					setError(String(result.message ?? result.reason ?? "failed"));
					return;
				}
				props.inputActions?.setDraft?.(String(result.draft ?? ""));
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : String(cause));
			} finally {
				setBusy(false);
			}
		})();
	}, [disabled, draft, props.inputActions, props.sessionId]);

	return (
		<Tooltip label={label} side="top" delayMs={400}>
			<Button
				variant="ghost"
				size="sm"
				type="button"
				icon={<IconSparkle16 size={14} />}
				aria-label={label}
				aria-busy={busy ? "true" : undefined}
				disabled={disabled}
				onMouseDown={(event) => event.preventDefault()}
				onClick={onClick}
			/>
		</Tooltip>
	);
}

/**
 * Plugin entry point for the client tree.
 * @param ctx - client plugin context.
 */
export function apply(ctx: ClientContext): void {
	const slots = ctx.get("slots") as SlotsService | undefined;
	if (slots === undefined || slots === null) return;
	const locale = localeStoreOf(ctx);
	// `conversation.input.right` renders immediately before the model seat, and
	// nothing first-party occupies it, so the button lands next to the model
	// selector without displacing a shipped control.
	slots.inject("conversation.input.right", () => {
		slots.register({
			name: "conversation.input.right",
			id: `${PLUGIN_ID}-button`,
			order: 10,
			label: "✨"
		}, (props: SlotProps) => <EnhanceButton {...props} __locale={locale} />);
	});
}

export const name = "composer-enhance";

/** The slot registry is the only client service this half needs. */
export const inject = ["slots"];
