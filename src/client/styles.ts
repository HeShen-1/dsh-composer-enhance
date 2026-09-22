/**
 * Component styles, injected once per page.
 *
 * The grammar is the shipped composer dock's, not an invention: a card that
 * mirrors the composer width through the same `--dsh-composer-*` metrics the
 * first-party docks use, a hairline `--dsw-alias-border-l1` outline, the
 * `--dsw-specific-tip` surface, and `--dsw-*` label tokens for text. No colour
 * is hardcoded and no other plugin's CSS-module hash classes are referenced, so
 * the block follows whichever theme is active.
 */

/** Attribute marking our stylesheet so it is injected exactly once. */
export const STYLE_MARKER = "dsh-composer-enhance";

const CSS = [
	// Same width computation as the shipped dock cards: the composer width minus
	// its side clearance and four dock insets.
	".dshce-card{box-sizing:border-box;",
	"width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));",
	"max-width:calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));",
	"border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-tip);",
	"--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);",
	"border-radius:12px;flex:none;margin:0 auto;overflow:hidden}",
	".dshce-body{display:flex;flex-direction:column;gap:8px;padding:6px 12px}",
	// A question panel is the one body that can outgrow the viewport: three
	// questions plus their free-text rows reached 565px tall against a 577px
	// viewport, which pushed the card's own title row off the top edge. The band
	// is capped and scrolled instead, so header and footer stay reachable.
	".dshce-bodyScroll{max-height:min(40vh,320px);overflow-y:auto;overscroll-behavior:contain}",
	".dshce-row{display:flex;align-items:center;gap:8px;min-width:0}",
	".dshce-lead{color:var(--dsw-alias-label-tertiary);flex:none;display:grid;place-items:center}",
	".dshce-title{color:var(--dsw-alias-label-primary);flex:none;font-size:13px;font-weight:500;line-height:24px}",
	".dshce-sub{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:auto;font-size:13px;line-height:20px;overflow:hidden}",
	".dshce-status{min-width:0;margin:0;color:var(--dsw-alias-label-primary);flex:auto;font-size:13px;line-height:24px}",
	".dshce-status[data-tone=error]{color:var(--dsw-alias-state-error-primary)}",
	".dshce-spacer{flex:1}",
	".dshce-spin{flex:none;color:var(--dsw-alias-label-tertiary);display:grid;place-items:center;animation:dshce-spin 1s linear infinite}",
	"@keyframes dshce-spin{to{transform:rotate(360deg)}}",
	"@media (prefers-reduced-motion:reduce){.dshce-spin{animation:none}}",
	// The chips row: one line, scrollable rather than wrapped so the composer
	// above never shifts by more than a single row.
	".dshce-chips{display:flex;align-items:center;gap:6px;min-width:0;overflow-x:auto;padding-bottom:2px}",
	".dshce-chips>*{flex:none}",
	".dshce-chipOther{min-width:160px;flex:1}",
	".dshce-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}",
	".dshce-issue{display:flex;align-items:flex-start;gap:8px;min-width:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}",
	".dshce-issue>span:last-child{min-width:0;word-break:break-word}",
	".dshce-kind{flex:none;margin-top:1px}",
	// Assumptions read one level quieter than the change list on purpose.
	".dshce-assumptions{margin:2px 0 0;padding:0 0 0 2px;list-style:none;display:flex;flex-direction:column;gap:2px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
	".dshce-question{display:flex;flex-direction:column;gap:4px;min-width:0}",
	".dshce-qhead{color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:16px}",
	".dshce-qtext{margin:0;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}",
	".dshce-options{display:flex;flex-direction:column;gap:2px;padding:2px 0}",
	".dshce-option{display:flex;align-items:center;gap:6px;min-width:0}",
	".dshce-free{margin-top:2px}",
	".dshce-foot{display:flex;align-items:center;gap:8px;padding:6px 12px 8px;flex:none;border-top:.5px solid var(--dsw-alias-border-l1)}"
].join("");

/**
 * Inject the stylesheet once per page.
 * @param doc - document to inject into; a missing one is a no-op.
 */
export function installStyles(doc: Document | undefined): void {
	if (doc === undefined) return;
	if (doc.querySelector(`style[data-plugin-css="${STYLE_MARKER}"]`) !== null) return;
	const tag = doc.createElement("style");
	tag.dataset.plugin = STYLE_MARKER;
	tag.dataset.pluginCss = STYLE_MARKER;
	tag.textContent = CSS;
	doc.head.appendChild(tag);
}
