window.__ModuleLoader__.load({
	id: "dsh-composer-enhance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		"use strict";
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __export = (target, all) => {
		  for (var name2 in all)
		    __defProp(target, name2, { get: all[name2], enumerable: true });
		};
		var __copyProps = (to, from, except, desc) => {
		  if (from && typeof from === "object" || typeof from === "function") {
		    for (let key of __getOwnPropNames(from))
		      if (!__hasOwnProp.call(to, key) && key !== except)
		        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
		  }
		  return to;
		};
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

		// src/client/index.tsx
		var index_exports = {};
		__export(index_exports, {
		  apply: () => apply,
		  inject: () => inject,
		  name: () => name
		});
		module.exports = __toCommonJS(index_exports);
		var import_react = require("react");
		var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		var import_jsx_runtime = require("react/jsx-runtime");
		var ROUTE = "/dsh-composer-enhance/enhance";
		var PLUGIN_ID = "dsh-composer-enhance";
		var CJK_RE = /^zh\b|^zh-|-hans\b|-hant\b/iu;
		var COPY = {
		  en: {
		    enhance: "Enhance prompt",
		    empty: "Enhance prompt (write something first)",
		    locked: "Enhance prompt (wait for the composer)",
		    busy: "Enhancing your prompt"
		  },
		  zh: {
		    enhance: "\u589E\u5F3A\u63D0\u793A\u8BCD",
		    empty: "\u589E\u5F3A\u63D0\u793A\u8BCD\uFF08\u5148\u5199\u70B9\u4E1C\u897F\uFF09",
		    locked: "\u589E\u5F3A\u63D0\u793A\u8BCD\uFF08\u7B49\u8F93\u5165\u6846\u53EF\u7528\uFF09",
		    busy: "\u6B63\u5728\u589E\u5F3A\u63D0\u793A\u8BCD"
		  }
		};
		function localeStoreOf(ctx) {
		  const service = ctx.get("locale");
		  return {
		    subscribe: (listener) => typeof service?.subscribe === "function" ? service.subscribe(listener) : () => {
		    },
		    getSnapshot: () => {
		      const value = service?.getSnapshot?.();
		      if (typeof value === "string") return value;
		      if (value !== null && typeof value === "object" && typeof value.active === "string") {
		        const active = value.active;
		        if (active !== "") return active;
		      }
		      const nav = typeof navigator === "undefined" ? void 0 : navigator.language;
		      return typeof nav === "string" ? nav : "";
		    }
		  };
		}
		function EnhanceButton(props) {
		  const localeStore = props.__locale;
		  const locale = (0, import_react.useSyncExternalStore)(
		    (0, import_react.useCallback)((listener) => localeStore?.subscribe(listener) ?? (() => {
		    }), [localeStore]),
		    (0, import_react.useCallback)(() => localeStore?.getSnapshot() ?? "", [localeStore])
		  );
		  const t = CJK_RE.test(locale) ? COPY.zh : COPY.en;
		  const draft = props.useInput((value) => value.draft);
		  const phase = props.useInput((value) => value.phase);
		  const [busy, setBusy] = (0, import_react.useState)(false);
		  const [error, setError] = (0, import_react.useState)("");
		  const empty = draft.trim() === "";
		  const disabled = busy || empty || phase !== "plain";
		  const label = error !== "" ? `${t.enhance} \u2014 ${error}` : busy ? t.busy : empty ? t.empty : phase !== "plain" ? t.locked : t.enhance;
		  const onClick = (0, import_react.useCallback)(() => {
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
		        const result = await response.json();
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
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tooltip, { label, side: "top", delayMs: 400, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		    import_dsh_client_ui_primitives.Button,
		    {
		      variant: "ghost",
		      size: "sm",
		      type: "button",
		      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconSparkle16, { size: 14 }),
		      "aria-label": label,
		      "aria-busy": busy ? "true" : void 0,
		      disabled,
		      onMouseDown: (event) => event.preventDefault(),
		      onClick
		    }
		  ) });
		}
		function apply(ctx) {
		  const slots = ctx.get("slots");
		  if (slots === void 0 || slots === null) return;
		  const locale = localeStoreOf(ctx);
		  slots.inject("conversation.input.right", () => {
		    slots.register({
		      name: "conversation.input.right",
		      id: `${PLUGIN_ID}-button`,
		      order: 10,
		      label: "\u2728"
		    }, (props) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EnhanceButton, { ...props, __locale: locale }));
		  });
		}
		var name = "composer-enhance";
		var inject = ["slots"];
		return module.exports;
	}
});
