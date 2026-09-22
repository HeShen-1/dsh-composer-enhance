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

		// src/client/styles.ts
		var STYLE_MARKER = "dsh-composer-enhance";
		var CSS = [
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
		  // The slow review's offer sits one level below the change list: the draft above
		  // it is untouched, so this reads as a suggestion, not as a result.
		  ".dshce-offer{display:flex;align-items:center;gap:8px;min-width:0;margin-top:2px;padding-top:6px;border-top:.5px solid var(--dsw-alias-border-l1)}",
		  ".dshce-offerText{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:none;font-size:12px;line-height:20px}",
		  ".dshce-question{display:flex;flex-direction:column;gap:4px;min-width:0}",
		  ".dshce-qhead{color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:16px}",
		  ".dshce-qtext{margin:0;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}",
		  ".dshce-options{display:flex;flex-direction:column;gap:2px;padding:2px 0}",
		  ".dshce-option{display:flex;align-items:center;gap:6px;min-width:0}",
		  ".dshce-free{margin-top:2px}",
		  ".dshce-foot{display:flex;align-items:center;gap:8px;padding:6px 12px 8px;flex:none;border-top:.5px solid var(--dsw-alias-border-l1)}"
		].join("");
		function installStyles(doc) {
		  if (doc === void 0) return;
		  if (doc.querySelector(`style[data-plugin-css="${STYLE_MARKER}"]`) !== null) return;
		  const tag = doc.createElement("style");
		  tag.dataset.plugin = STYLE_MARKER;
		  tag.dataset.pluginCss = STYLE_MARKER;
		  tag.textContent = CSS;
		  doc.head.appendChild(tag);
		}

		// src/client/ui.tsx
		var import_react = require("react");
		var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		// src/client/protocol.ts
		var ROUTE = "/dsh-composer-enhance/enhance";
		var MAX_CHIPS = 4;
		var MAX_QUESTIONS = 3;
		var MAX_OPTIONS = 5;
		var CHIPS_ANSWER_KEY = "chips";
		var MAX_GATE_ROUNDS = 2;
		var SLOW_WINDOW_MS = 3e4;
		function normalizeChips(value) {
		  if (!Array.isArray(value)) return [];
		  const chips = [];
		  for (const entry of value) {
		    if (entry === null || typeof entry !== "object") continue;
		    const label = entry.label;
		    if (typeof label !== "string" || label.trim() === "") continue;
		    chips.push({ label });
		    if (chips.length >= MAX_CHIPS) break;
		  }
		  return chips;
		}
		function normalizeQuestions(value) {
		  if (!Array.isArray(value)) return [];
		  const questions = [];
		  for (const entry of value) {
		    if (entry === null || typeof entry !== "object") continue;
		    const raw = entry;
		    const question = typeof raw.question === "string" ? raw.question : "";
		    if (question.trim() === "") continue;
		    const options = [];
		    if (Array.isArray(raw.options)) {
		      for (const option of raw.options) {
		        if (option === null || typeof option !== "object") continue;
		        const label = option.label;
		        if (typeof label !== "string" || label.trim() === "") continue;
		        const description = option.description;
		        options.push({
		          label,
		          description: typeof description === "string" ? description : void 0,
		          recommended: option.recommended === true
		        });
		        if (options.length >= MAX_OPTIONS) break;
		      }
		    }
		    questions.push({
		      id: typeof raw.id === "string" && raw.id !== "" ? raw.id : `q${questions.length + 1}`,
		      header: typeof raw.header === "string" ? raw.header : void 0,
		      question,
		      options
		    });
		    if (questions.length >= MAX_QUESTIONS) break;
		  }
		  return questions;
		}
		function normalizeGate(value) {
		  if (value === null || typeof value !== "object") return { shape: "none" };
		  const raw = value;
		  return {
		    hasAmbiguity: raw.hasAmbiguity === true,
		    ambiguityType: typeof raw.ambiguityType === "string" ? raw.ambiguityType : void 0,
		    reason: typeof raw.reason === "string" ? raw.reason : "",
		    shape: raw.shape === "chips" || raw.shape === "panel" || raw.shape === "none" ? raw.shape : void 0,
		    chips: normalizeChips(raw.chips),
		    questions: normalizeQuestions(raw.questions)
		  };
		}
		function normalizeIssues(value) {
		  if (!Array.isArray(value)) return [];
		  const issues = [];
		  for (const entry of value) {
		    if (entry === null || typeof entry !== "object") continue;
		    const raw = entry;
		    if (typeof raw.text !== "string" || raw.text.trim() === "") continue;
		    issues.push({ kind: typeof raw.kind === "string" ? raw.kind : "clarified", text: raw.text });
		  }
		  return issues;
		}
		function normalizeAssumptions(value) {
		  if (!Array.isArray(value)) return [];
		  return value.filter((entry) => typeof entry === "string" && entry.trim() !== "");
		}
		function chipQuestionEcho(chips, reason) {
		  return [{
		    id: CHIPS_ANSWER_KEY,
		    header: "clarify",
		    question: reason !== "" ? reason : chips.map((chip) => chip.label).join(" / "),
		    options: chips.map((chip) => ({ label: chip.label }))
		  }];
		}

		// src/client/store.ts
		var NO_FACTS = { draft: "", draftRev: 0, phase: "plain", refCount: 0, attachmentCount: 0 };
		var NO_SLOW = {
		  slowPhase: "none",
		  fastDraft: null,
		  fastIssues: [],
		  fastAssumptions: [],
		  slowDraft: null,
		  slowIssues: [],
		  slowAssumptions: [],
		  slowCount: 0
		};
		function editorHasFocus() {
		  if (typeof document === "undefined") return false;
		  const active = document.activeElement;
		  if (active === null) return false;
		  if (active instanceof HTMLElement && active.isContentEditable) return true;
		  return active.closest('[contenteditable="true"]') !== null;
		}
		function createFlowStore(sessionId) {
		  let scope = { sessionId };
		  let listeners = [];
		  let inFlight = null;
		  let slowInFlight = null;
		  let noticeTimer = null;
		  const state = {
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
		    facts: NO_FACTS,
		    ...NO_SLOW
		  };
		  let snapshot = Object.freeze({ ...state });
		  const publish = () => {
		    snapshot = Object.freeze({ ...state });
		  };
		  let emitting = false;
		  let pending = false;
		  const emit = () => {
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
		  const patch = (next) => {
		    Object.assign(state, next);
		    emit();
		  };
		  const clearNoticeTimer = () => {
		    if (noticeTimer !== null) clearTimeout(noticeTimer);
		    noticeTimer = null;
		  };
		  const abortInFlight = () => {
		    const controller = inFlight;
		    inFlight = null;
		    if (controller === null) return;
		    try {
		      controller.abort();
		    } catch {
		    }
		  };
		  const abortSlow = () => {
		    const controller = slowInFlight;
		    slowInFlight = null;
		    if (controller === null) return;
		    try {
		      controller.abort();
		    } catch {
		    }
		  };
		  const writeDraft = (draft) => {
		    scope.inputActions?.setDraft?.(draft);
		  };
		  const statusNow = () => state.status;
		  const post = async (payload) => {
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
		      return await response.json();
		    } catch (cause) {
		      inFlight = null;
		      if (cause !== null && typeof cause === "object" && cause.name === "AbortError") {
		        return { ok: false, reason: "aborted" };
		      }
		      return { ok: false, reason: "network", message: cause instanceof Error ? cause.message : String(cause) };
		    }
		  };
		  const applySlow = (draft, issues, assumptions) => {
		    patch({
		      slowPhase: "applied",
		      slowDraft: draft,
		      slowIssues: issues,
		      slowAssumptions: assumptions,
		      slowCount: issues.length,
		      issues,
		      assumptions,
		      writtenDraft: draft
		    });
		    writeDraft(draft);
		  };
		  const startSlow = async (fastDraft) => {
		    const controller = new AbortController();
		    slowInFlight = controller;
		    const issuedAt = Date.now();
		    const dropSlow = () => {
		      if (state.slowPhase === "running") patch({ slowPhase: "none" });
		    };
		    let result;
		    try {
		      const response = await fetch(ROUTE, {
		        method: "POST",
		        headers: { "content-type": "application/json" },
		        body: JSON.stringify({
		          sessionId: scope.sessionId ?? "",
		          stage: "slow",
		          draft: fastDraft,
		          baselineDraft: state.baselineDraft
		        }),
		        signal: controller.signal
		      });
		      if (!response.ok) {
		        dropSlow();
		        return;
		      }
		      result = await response.json();
		    } catch {
		      dropSlow();
		      return;
		    }
		    if (slowInFlight !== controller) return;
		    slowInFlight = null;
		    if (state.status !== "done" || state.writtenDraft !== fastDraft) return;
		    if (result.ok !== true) {
		      dropSlow();
		      return;
		    }
		    const draft = typeof result.draft === "string" ? result.draft : "";
		    if (draft.trim() === "" || draft === fastDraft) {
		      dropSlow();
		      return;
		    }
		    const issues = normalizeIssues(result.issues);
		    if (issues.length === 0) {
		      dropSlow();
		      return;
		    }
		    const assumptions = normalizeAssumptions(result.assumptions);
		    const elapsed = Date.now() - issuedAt;
		    const factsDraft = state.facts.draft;
		    const unedited = factsDraft === fastDraft || factsDraft === state.baselineDraft;
		    if (elapsed <= SLOW_WINDOW_MS && unedited && editorHasFocus()) {
		      applySlow(draft, issues, assumptions);
		      return;
		    }
		    patch({
		      slowPhase: "offered",
		      slowDraft: draft,
		      slowIssues: issues,
		      slowAssumptions: assumptions,
		      slowCount: issues.length
		    });
		  };
		  const acceptDraft = (draft, result) => {
		    abortSlow();
		    const issues = normalizeIssues(result.issues);
		    const assumptions = normalizeAssumptions(result.assumptions);
		    patch({
		      status: "done",
		      writtenDraft: draft,
		      issues,
		      assumptions,
		      ...NO_SLOW,
		      slowPhase: "running",
		      fastDraft: draft,
		      fastIssues: issues,
		      fastAssumptions: assumptions,
		      chips: [],
		      questions: [],
		      reason: "",
		      errorCode: "",
		      errorMessage: "",
		      chipOther: "",
		      chipOtherOpen: false
		    });
		    writeDraft(draft);
		    void startSlow(draft);
		  };
		  const fail = (code, message) => {
		    patch({
		      status: "failed",
		      errorCode: code,
		      errorMessage: message,
		      chips: [],
		      questions: [],
		      reason: ""
		    });
		  };
		  const settle = (result, baseline) => {
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
		  const runAnswered = async (answers, questions) => {
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
		  const start = async () => {
		    if (state.status === "gating" || state.status === "writing") return;
		    const draft = state.facts.draft;
		    if (draft.trim() === "") return;
		    if (state.facts.phase !== "plain" || state.facts.refCount > 0) return;
		    abortInFlight();
		    abortSlow();
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
		      rounds: 0,
		      ...NO_SLOW
		    });
		    const result = await post({
		      sessionId: scope.sessionId ?? "",
		      stage: "fast",
		      draft,
		      questions: [],
		      answers: {}
		    });
		    if (statusNow() !== "gating" || state.baselineDraft !== draft) return;
		    settle(result, draft);
		  };
		  const stillOnBaseline = () => state.facts.draft === state.baselineDraft;
		  const pickChip = async (label) => {
		    if (state.status !== "chips") return;
		    if (!stillOnBaseline()) {
		      cancel();
		      return;
		    }
		    const answered = { chips: state.chips, reason: state.reason };
		    const answers = { [CHIPS_ANSWER_KEY]: [label] };
		    const outcome = await runAnswered(answers, []);
		    if (outcome !== "gated" || state.status !== "chips" || !stillOnBaseline()) return;
		    console.warn("[dsh-composer-enhance] host re-gated a chips answer sent without a questions echo; retrying with the echo", {
		      label,
		      chips: answered.chips.map((chip) => chip.label)
		    });
		    await runAnswered(answers, chipQuestionEcho(answered.chips, answered.reason));
		  };
		  const submitChipOther = async () => {
		    const text = state.chipOther.trim();
		    if (text === "") return;
		    await pickChip(text);
		  };
		  const submitAnswers = async () => {
		    if (state.status !== "panel") return;
		    if (!stillOnBaseline()) {
		      cancel();
		      return;
		    }
		    const answers = {};
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
		  const skipQuestions = async () => {
		    if (state.status !== "panel") return;
		    await runAnswered({}, state.questions);
		  };
		  const cancel = () => {
		    clearNoticeTimer();
		    abortInFlight();
		    abortSlow();
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
		      rounds: 0,
		      ...NO_SLOW
		    });
		  };
		  const dismiss = () => {
		    clearNoticeTimer();
		    abortSlow();
		    patch({
		      status: "idle",
		      issues: [],
		      assumptions: [],
		      writtenDraft: null,
		      errorCode: "",
		      errorMessage: "",
		      reason: "",
		      rounds: 0,
		      ...NO_SLOW
		    });
		  };
		  const restore = () => {
		    const previous = state.baselineDraft;
		    clearNoticeTimer();
		    abortSlow();
		    patch({
		      status: "idle",
		      issues: [],
		      assumptions: [],
		      writtenDraft: null,
		      errorCode: "",
		      errorMessage: "",
		      reason: "",
		      rounds: 0,
		      ...NO_SLOW
		    });
		    writeDraft(previous);
		  };
		  const applyOfferedSlow = () => {
		    const draft = state.slowDraft;
		    if (draft === null || state.status !== "done") return;
		    applySlow(draft, state.slowIssues, state.slowAssumptions);
		  };
		  const restoreFast = () => {
		    const fast = state.fastDraft;
		    if (fast === null || state.status !== "done") return;
		    abortSlow();
		    patch({
		      issues: state.fastIssues,
		      assumptions: state.fastAssumptions,
		      writtenDraft: fast,
		      ...NO_SLOW
		    });
		    writeDraft(fast);
		  };
		  const dismissSlowOffer = () => {
		    abortSlow();
		    patch({ ...NO_SLOW });
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
		      const updated = next ? [...current.filter((entry) => entry !== label), label] : current.filter((entry) => entry !== label);
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
		    applySlow: applyOfferedSlow,
		    restoreFast,
		    dismissSlowOffer,
		    sync(facts) {
		      const previous = state.facts;
		      const unchanged = previous.draft === facts.draft && previous.draftRev === facts.draftRev && previous.phase === facts.phase && previous.refCount === facts.refCount && previous.attachmentCount === facts.attachmentCount;
		      if (unchanged) return;
		      state.facts = facts;
		      if (state.status === "done" && state.writtenDraft !== null && facts.draft !== state.writtenDraft) {
		        dismiss();
		        return;
		      }
		      const live = state.status === "gating" || state.status === "writing" || state.status === "chips" || state.status === "panel";
		      if (live && facts.draft !== state.baselineDraft) {
		        cancel();
		        return;
		      }
		      emit();
		    }
		  };
		}
		var stores = /* @__PURE__ */ new Map();
		function storeFor(sessionId) {
		  const key = typeof sessionId === "string" && sessionId !== "" ? sessionId : "__nosession__";
		  let store = stores.get(key);
		  if (store === void 0) {
		    store = createFlowStore(sessionId);
		    stores.set(key, store);
		  }
		  return store;
		}

		// src/client/ui.tsx
		var import_jsx_runtime = require("react/jsx-runtime");
		var CJK_RE = /^zh\b|^zh-|-hans\b|-hant\b/iu;
		var COPY = {
		  en: {
		    enhance: "Enhance prompt",
		    analyzing: "Reading the draft\u2026",
		    writing: "Rewriting\u2026",
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
		    otherHint: "Other\u2026",
		    freeHint: "Or type your own answer",
		    recommended: "Recommended",
		    failed: "Enhance failed: ",
		    assumptions: "Assumed: ",
		    slowOffer: (count) => `A stricter version is available (${count} changes)`,
		    slowApply: "Review & replace",
		    restoreFast: "Restore fast version",
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
		    enhance: "\u589E\u5F3A\u63D0\u793A\u8BCD",
		    analyzing: "\u6B63\u5728\u5206\u6790\u8349\u7A3F\u2026",
		    writing: "\u6B63\u5728\u6539\u5199\u2026",
		    empty: "\u589E\u5F3A\u63D0\u793A\u8BCD\uFF08\u5148\u5199\u70B9\u4E1C\u897F\uFF09",
		    locked: "\u589E\u5F3A\u63D0\u793A\u8BCD\uFF08\u7B49\u8F93\u5165\u6846\u53EF\u7528\uFF09",
		    references: "\u589E\u5F3A\u63D0\u793A\u8BCD\uFF08\u8349\u7A3F\u91CC\u6709 @ \u5F15\u7528\uFF0C\u589E\u5F3A\u4F1A\u4E22\u6389\u5F15\u7528\u6C14\u6CE1\uFF09",
		    clarifying: "\u589E\u5F3A\u63D0\u793A\u8BCD\uFF08\u5148\u5904\u7406\u4E0A\u9762\u7684\u95EE\u9898\uFF09",
		    enhanced: "\u5DF2\u589E\u5F3A",
		    restore: "\u8FD8\u539F\u539F\u6587",
		    close: "\u5173\u95ED",
		    cancel: "\u53D6\u6D88",
		    skip: "\u8DF3\u8FC7",
		    apply: "\u589E\u5F3A",
		    needConfirm: "\u9700\u8981\u786E\u8BA4",
		    writeOwn: "\u81EA\u5DF1\u5199",
		    otherHint: "\u5176\u5B83\u2026",
		    freeHint: "\u6216\u76F4\u63A5\u5199\u4F60\u7684\u7B54\u6848",
		    recommended: "\u63A8\u8350",
		    failed: "\u589E\u5F3A\u5931\u8D25\uFF1A",
		    assumptions: "\u5047\u8BBE\uFF1A",
		    slowOffer: (count) => `\u66F4\u4E25\u683C\u7684\u7248\u672C\u53EF\u7528\uFF08\u6539\u4E86 ${count} \u5904\uFF09`,
		    slowApply: "\u67E5\u770B/\u66FF\u6362",
		    restoreFast: "\u8FD8\u539F\u5230\u5FEB\u8F68\u7248",
		    kinds: { added: "\u65B0\u589E", clarified: "\u660E\u786E", restructured: "\u91CD\u7EC4", assumption: "\u5047\u8BBE" },
		    reasons: {
		      "no-route": "\u6CA1\u6709\u53EF\u7528\u7684\u6A21\u578B\u8DEF\u7531",
		      "bad-request": "\u8BF7\u6C42\u4E0D\u5408\u6CD5",
		      "model-error": "\u6A21\u578B\u8C03\u7528\u5931\u8D25",
		      "empty-result": "\u6A21\u578B\u6CA1\u6709\u7ED9\u51FA\u6539\u5199\u7ED3\u679C",
		      "stale": "\u8349\u7A3F\u5DF2\u6539\u52A8\uFF0C\u672C\u6B21\u589E\u5F3A\u4F5C\u5E9F",
		      network: "\u8BF7\u6C42\u6CA1\u6709\u5230\u8FBE host",
		      aborted: "\u5DF2\u53D6\u6D88",
		      internal: "\u5185\u90E8\u9519\u8BEF"
		    }
		  }
		};
		var KIND_TONE = {
		  added: "info",
		  clarified: "neutral",
		  restructured: "warning",
		  assumption: "quiet"
		};
		function useFlow(props) {
		  const [localeStore] = (0, import_react.useState)(() => props.__localeStore);
		  const store = storeFor(props.sessionId);
		  const state = (0, import_react.useSyncExternalStore)(
		    (0, import_react.useCallback)((listener) => store.subscribe(listener), [store]),
		    (0, import_react.useCallback)(() => store.getSnapshot(), [store])
		  );
		  const locale = (0, import_react.useSyncExternalStore)(
		    (0, import_react.useCallback)((listener) => localeStore?.subscribe(listener) ?? (() => {
		    }), [localeStore]),
		    (0, import_react.useCallback)(() => localeStore?.getSnapshot() ?? "", [localeStore])
		  );
		  const t = CJK_RE.test(locale) ? COPY.zh : COPY.en;
		  const draft = props.useInput((value) => value.draft);
		  const draftRev = props.useInput((value) => value.draftRev);
		  const phase = props.useInput((value) => value.phase);
		  const refCount = props.useInput((value) => value.occurrences?.length ?? 0);
		  const attachmentCount = props.useInput((value) => value.attachmentIds?.length ?? 0);
		  store.bind({ sessionId: props.sessionId, inputActions: props.inputActions });
		  (0, import_react.useEffect)(() => {
		    store.sync({ draft, draftRev, phase, refCount, attachmentCount });
		  }, [store, draft, draftRev, phase, refCount, attachmentCount]);
		  (0, import_react.useEffect)(() => () => {
		    store.cancel();
		  }, [store]);
		  return { store, state, t };
		}
		function blockedReason(state, facts, t) {
		  if (state.status === "gating") return t.analyzing;
		  if (state.status === "writing") return t.writing;
		  if (facts.refCount > 0) return t.references;
		  if (facts.draft.trim() === "") return t.empty;
		  if (facts.phase !== "plain") return t.locked;
		  if (state.status === "chips" || state.status === "panel") return t.clarifying;
		  return "";
		}
		function EnhanceButton(props) {
		  const { store, state, t } = useFlow(props);
		  const draft = props.useInput((value) => value.draft);
		  const phase = props.useInput((value) => value.phase);
		  const refCount = props.useInput((value) => value.occurrences?.length ?? 0);
		  const busy = state.status === "gating" || state.status === "writing";
		  const blocked = blockedReason(state, { draft, phase, refCount }, t);
		  const disabled = busy || blocked !== "";
		  const label = blocked !== "" ? blocked : t.enhance;
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tooltip, { label, side: "top", delayMs: 400, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		    import_dsh_client_ui_primitives.Button,
		    {
		      variant: "ghost",
		      size: "sm",
		      type: "button",
		      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconSparkle16, { size: 14 }),
		      "aria-label": label,
		      "aria-busy": busy ? "true" : void 0,
		      "data-dshce": "button",
		      disabled,
		      onMouseDown: (event) => event.preventDefault(),
		      onClick: () => store.start()
		    }
		  ) });
		}
		function IssueRow({ issue, t }) {
		  const kind = issue.kind ?? "clarified";
		  const known = kind === "added" || kind === "clarified" || kind === "restructured" || kind === "assumption";
		  const label = known ? t.kinds[kind] : kind;
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "dshce-issue", children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tag, { tone: known ? KIND_TONE[kind] : "outline", className: "dshce-kind", children: label }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: issue.text })
		  ] });
		}
		function CloseButton({ label, onClick }) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		    import_dsh_client_ui_primitives.Button,
		    {
		      variant: "ghost",
		      size: "sm",
		      type: "button",
		      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 }),
		      "aria-label": label,
		      "data-dshce": "close",
		      onClick
		    }
		  );
		}
		function ResultBar({ state, t, onRestore, onRestoreFast, onApplySlow, onDismissSlow, onClose }) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dshce-card", "data-dshce": "result", "data-slow": state.slowPhase, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-body", children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-row", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-lead", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconSparkle16, { size: 14 }) }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-title", children: t.enhanced }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-spacer" }),
		      state.slowPhase === "applied" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		        import_dsh_client_ui_primitives.Button,
		        {
		          variant: "ghost",
		          size: "sm",
		          type: "button",
		          "data-dshce": "restore-fast",
		          onClick: onRestoreFast,
		          children: t.restoreFast
		        }
		      ) : null,
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", type: "button", "data-dshce": "restore", onClick: onRestore, children: t.restore }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloseButton, { label: t.close, onClick: onClose })
		    ] }),
		    state.issues.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "dshce-list", children: state.issues.map((issue, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IssueRow, { issue, t }, `${issue.kind ?? "k"}:${index}`)) }) : null,
		    state.assumptions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "dshce-assumptions", children: state.assumptions.map((assumption, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: `${t.assumptions}${assumption}` }, `a:${index}`)) }) : null,
		    state.slowPhase === "offered" && state.slowDraft !== null ? (
		      // The slow review landed outside its safety valves, so the draft
		      // stays untouched and the stricter text waits behind a click.
		      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-offer", "data-dshce": "slow-offer", children: [
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-offerText", children: t.slowOffer(state.slowCount) }),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-spacer" }),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		          import_dsh_client_ui_primitives.Button,
		          {
		            variant: "outline",
		            size: "sm",
		            type: "button",
		            "data-dshce": "slow-apply",
		            onClick: onApplySlow,
		            children: t.slowApply
		          }
		        ),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloseButton, { label: t.close, onClick: onDismissSlow })
		      ] })
		    ) : null
		  ] }) });
		}
		function ChipsRow({ state, t, store }) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dshce-card", "data-dshce": "chips", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-body", children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-row", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-lead", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconSparkle16, { size: 14 }) }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-sub", title: state.reason, children: state.reason }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloseButton, { label: t.cancel, onClick: () => store.cancel() })
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-chips", role: "group", "aria-label": t.needConfirm, children: [
		      state.chips.map((chip) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		        import_dsh_client_ui_primitives.Pill,
		        {
		          type: "button",
		          title: chip.label,
		          "data-dshce": "chip",
		          onClick: () => store.pickChip(chip.label),
		          children: chip.label
		        },
		        chip.label
		      )),
		      state.chipOtherOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		        import_dsh_client_ui_primitives.Input,
		        {
		          className: "dshce-chipOther",
		          autoFocus: true,
		          value: state.chipOther,
		          placeholder: t.otherHint,
		          "aria-label": t.writeOwn,
		          onChange: (event) => store.setChipOther(event.target.value),
		          onKeyDown: (event) => {
		            if (event.key === "Enter") store.submitChipOther();
		            if (event.key === "Escape") store.openChipOther(false);
		          }
		        }
		      ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Pill, { type: "button", "data-dshce": "chip-other", onClick: () => store.openChipOther(true), children: t.writeOwn })
		    ] })
		  ] }) });
		}
		function QuestionPanel({ state, t, store }) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-card", "data-dshce": "panel", children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-body dshce-bodyScroll", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-row", children: [
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-lead", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconSparkle16, { size: 14 }) }),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-title", children: t.needConfirm }),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-sub", title: state.reason, children: state.reason }),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloseButton, { label: t.cancel, onClick: () => store.cancel() })
		      ] }),
		      state.questions.map((question) => {
		        const selected = state.answers[question.id] ?? [];
		        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-question", "data-dshce": "question", children: [
		          question.header !== void 0 && question.header !== "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-qhead", children: question.header }) : null,
		          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dshce-qtext", children: question.question }),
		          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dshce-options", children: (question.options ?? []).map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-option", children: [
		            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		              import_dsh_client_ui_primitives.Checkbox,
		              {
		                checked: selected.includes(option.label),
		                label: option.label,
		                title: option.description,
		                onChange: (next) => store.toggleAnswer(question.id, option.label, next)
		              }
		            ),
		            option.recommended === true ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tag, { tone: "quiet", children: t.recommended }) : null
		          ] }, option.label)) }),
		          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		            import_dsh_client_ui_primitives.Input,
		            {
		              className: "dshce-free",
		              value: state.freeText[question.id] ?? "",
		              placeholder: t.freeHint,
		              "aria-label": question.question,
		              "data-dshce": "free",
		              onChange: (event) => store.setFreeText(question.id, event.target.value)
		            }
		          )
		        ] }, question.id);
		      })
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-foot", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", type: "button", onClick: () => store.cancel(), children: t.cancel }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", type: "button", onClick: () => store.skipQuestions(), children: t.skip }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-spacer" }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		        import_dsh_client_ui_primitives.Button,
		        {
		          variant: "primary",
		          size: "sm",
		          type: "button",
		          "data-dshce": "apply",
		          onClick: () => store.submitAnswers(),
		          children: t.apply
		        }
		      )
		    ] })
		  ] });
		}
		function StatusLine({ tone, text, t, onClose }) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dshce-card", "data-dshce": "status", "data-tone": tone, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dshce-body", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dshce-row", children: [
		    tone === "busy" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-spin", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconLoadingOutline16, { size: 14 }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dshce-lead", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconWarningOutline16, { size: 14 }) }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dshce-status", "data-tone": tone, role: tone === "error" ? "alert" : void 0, children: text }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloseButton, { label: tone === "busy" ? t.cancel : t.close, onClick: onClose })
		  ] }) }) });
		}
		function EnhanceDock(props) {
		  const { store, state, t } = useFlow(props);
		  const status = state.status;
		  (0, import_react.useEffect)(() => {
		    if (status !== "chips" && status !== "panel") return;
		    const onKeyDown = (event) => {
		      if (event.key === "Escape") store.cancel();
		    };
		    window.addEventListener("keydown", onKeyDown);
		    return () => window.removeEventListener("keydown", onKeyDown);
		  }, [status, store]);
		  if (status === "chips") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipsRow, { state, t, store });
		  if (status === "panel") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionPanel, { state, t, store });
		  if (status === "gating") {
		    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, { tone: "busy", text: t.analyzing, t, onClose: () => store.cancel() });
		  }
		  if (status === "writing") {
		    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, { tone: "busy", text: t.writing, t, onClose: () => store.cancel() });
		  }
		  if (status === "failed") {
		    const message = state.errorMessage !== "" ? state.errorMessage : t.reasons[state.errorCode] ?? state.errorCode;
		    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, { tone: "error", text: `${t.failed}${message}`, t, onClose: () => store.dismiss() });
		  }
		  if (status === "done") {
		    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		      ResultBar,
		      {
		        state,
		        t,
		        onRestore: () => store.restore(),
		        onRestoreFast: () => store.restoreFast(),
		        onApplySlow: () => store.applySlow(),
		        onDismissSlow: () => store.dismissSlowOffer(),
		        onClose: () => store.dismiss()
		      }
		    );
		  }
		  return null;
		}

		// src/client/index.tsx
		var import_jsx_runtime2 = require("react/jsx-runtime");
		var PLUGIN_ID = "dsh-composer-enhance";
		function localeStoreOf(ctx) {
		  const service = ctx.get("locale");
		  return {
		    subscribe: (listener) => typeof service?.subscribe === "function" ? service.subscribe(listener) : () => {
		    },
		    getSnapshot: () => {
		      const value = service?.getSnapshot?.();
		      if (typeof value === "string") return value;
		      if (value !== null && typeof value === "object") {
		        const active = value.active;
		        if (typeof active === "string" && active !== "") return active;
		        const preference = value.preference;
		        if (typeof preference === "string" && preference !== "") return preference;
		      }
		      const nav = typeof navigator === "undefined" ? void 0 : navigator.language;
		      return typeof nav === "string" ? nav : "";
		    }
		  };
		}
		function apply(ctx) {
		  const slots = ctx.get("slots");
		  if (slots === void 0 || slots === null) return;
		  installStyles(typeof document === "undefined" ? void 0 : document);
		  const localeStore = localeStoreOf(ctx);
		  const wrap = (Component) => (props) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Component, { ...props, __localeStore: props.__localeStore ?? localeStore });
		  slots.inject("conversation.input.right", () => {
		    slots.register({
		      name: "conversation.input.right",
		      id: `${PLUGIN_ID}-button`,
		      order: 10,
		      label: "\u2728"
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
		var name = "composer-enhance";
		var inject = ["slots"];
		return module.exports;
	}
});
