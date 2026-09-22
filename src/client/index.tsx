/**
 * dsh-composer-enhance — browser half, entry point.
 *
 * Two slot registrations, one shared per-Session flow:
 *
 *   conversation.input.right  the ✨ button, order 10. This slot renders
 *                             immediately before the model seat, so the button
 *                             lands left of the model selector, on the same row.
 *   conversation.input.dock   order 5 — the dock above the composer card, where
 *                             TodoDock (0) and QueueDock (20) already sit, so a
 *                             chips row or question panel never covers the draft.
 *                             (`conversation.composer.dock` renders no marker in
 *                             this composition; the previous plugin verified that
 *                             live, and nothing registered there ever mounted.)
 *
 * Both occupants render the same store slice, so a pick in the dock is visible
 * to the button without prop threading.
 */
import { installStyles } from "./styles";
import { EnhanceButton, EnhanceDock, type SlotProps, type Store } from "./ui";

/** Plugin id, also the label every slot registration carries. */
const PLUGIN_ID = "dsh-composer-enhance";

/** The slice of the `slots` service this plugin uses. */
interface SlotsService {
	inject(name: string, callback: () => void): void;
	register(
		descriptor: { name: string; id: string; order: number; label?: string },
		component: unknown
	): void;
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
			if (value !== null && typeof value === "object") {
				const active = (value as { active?: unknown }).active;
				if (typeof active === "string" && active !== "") return active;
				const preference = (value as { preference?: unknown }).preference;
				if (typeof preference === "string" && preference !== "") return preference;
			}
			const nav = typeof navigator === "undefined" ? undefined : navigator.language;
			return typeof nav === "string" ? nav : "";
		}
	};
}

/**
 * A slot occupant. It must RENDER its component: returning the element would
 * hand React a function where it expects a child.
 */
type SlotComponent = (props: SlotProps) => unknown;

/**
 * Plugin entry point for the client tree.
 * @param ctx - client plugin context.
 */
export function apply(ctx: ClientContext): void {
	const slots = ctx.get("slots") as SlotsService | undefined;
	if (slots === undefined || slots === null) return;
	installStyles(typeof document === "undefined" ? undefined : document);
	const localeStore = localeStoreOf(ctx);

	const wrap = (Component: SlotComponent) => (props: SlotProps) => (
		<Component {...props} __localeStore={props.__localeStore ?? localeStore} />
	);

	slots.inject("conversation.input.right", () => {
		slots.register({
			name: "conversation.input.right",
			id: `${PLUGIN_ID}-button`,
			order: 10,
			label: "✨"
		}, wrap(EnhanceButton));
	});

	slots.inject("conversation.input.dock", () => {
		slots.register({
			name: "conversation.input.dock",
			id: `${PLUGIN_ID}-dock`,
			order: 5
		}, wrap(EnhanceDock));
	});
}

export const name = "composer-enhance";

/** The slot registry is the only client service this half needs. */
export const inject = ["slots"];
