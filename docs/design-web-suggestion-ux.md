# DSH Web 输入框「提示词增强 / 下一步建议」设计方案

> 结论先行：**做一个，但分两层交付**——P0 是输入框上方的一行「建议条」（点击采纳，Tab 作为增强键），P1 才是空草稿时输入框内的灰色 ghost 文本。
> 原因：DSH Web 的 Lexical 编辑器不向插件暴露光标/选区/按键仲裁，真正的「内联补全」只有「空草稿 + 覆盖 placeholder」这一种可行形态；而一行提示条可以完整承载功能与无障碍，且不占私有 DOM。
> 本文所有「公开扩展点」均按 dsh 0.2.1-rc.2 的实际契约与运行中 Slot 表核对，不是推测；推测处标〔推测〕。
>
> **实现状态（2026-10-19）**：P0 已实现。host 新增 `stage:"suggest"`（空草稿出建议、非空草稿 400），
> 客户端在 `conversation.input.dock` 渲染建议条，「采用」走 `captureInsertion+insertText`（CAS，单撤销步），
> Tab 拦截与点击同路径，不自动发送；防抖/单飞/抑制/冷却/TTL 在 store 里。真机 host 已返回
> `engine:"0.2.2-m1"` 且建议内容贴合最近对话；P1 内联 ghost 仍为计划。

---

## 1. 方案总览（先看这张表）

| 维度 | P0：建议条（推荐先做） | P1：内联 ghost（观感升级） |
|---|---|---|
| 呈现位置 | `conversation.input.dock`，输入卡片上方一行 | `conversation.input.overlay`，输入卡片内、placeholder 同位置 |
| 出现条件 | 一轮回复结束 + 草稿为空 + 本会话已不是 blank | 同 P0，另加「composer 有焦点」 |
| 内容 | 灰字建议全文（可 2 行截断）+ 右侧 `Tab 采用` / `×` | 灰色内联文本，尾部一个 `Tab` 键帽 |
| 采纳方式 | **点击**（主路径）；Tab（增强，DOM 拦截） | Tab（主路径，DOM 拦截）；点键帽（备用） |
| 采纳后 | 写入真实草稿（一次 `insertText`），**不自动发送**，光标停在文本末尾 | 同 P0 |
| 关闭/消失 | 打字、发送、×、Esc、切换会话、超时 | 同 P0 |
| 风险 | 低：全部公开 API | 中：要遮 placeholder、限长、Tab 拦截 |

**为什么不只做 P1**：内联 ghost 没法让输入卡片自动长高（overlay 是绝对定位层），长建议会溢出到工具栏；而且 shell 自己的灰色 placeholder 在同一位置，必须用不透明层盖住。短建议才行，长建议仍需 P0 那一行展示全文。
**为什么不只做 P0**：P0 的观感离 Claude Code / Codex 的「框内灰字」远，用户明确想要那个体感；P1 可以在低风险前提下补上。

---

## 2. 交互形态

### 2.1 P0：输入框上方一行建议条

```
┌──────────────────────────────────────────────────────────┐
│ ✨ 建议：把 README 的安装章节改成只保留 pnpm 一种方式      │  ← conversation.input.dock
│                                      [Tab] 采用    [×]   │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│                                                          │  ← 输入卡片（空）
│ [+]                                    [权限] [模型] [➤] │
└──────────────────────────────────────────────────────────┘
```

- 文案前缀统一「建议：」，弱化存在感；`aria-live="polite"`。
- 一行内省略号截断；hover 显示 title 全文（或点击「展开」由 P0 行变两行）。
- 「采用」按钮是主操作；`Tab` 键帽只是提示（键盘用户按 Tab 触发，见 3.2）。
- `×` 关闭本条建议并进入冷却（连续拒绝 N 条后降频，参照 Claude Code 的 20 条降频〔研究文档 §2.2〕）。

### 2.2 P1：空草稿内联灰色 ghost

```
┌──────────────────────────────────────────────────────────┐
│ 把 README 的安装章节改成只保留 pnpm 一种方式       [Tab]  │  ← overlay 层，灰字，pointer-events:none（键帽除外）
│                                                          │
│ [+]                                    [权限] [模型] [➤] │
└──────────────────────────────────────────────────────────┘
```

- 只在 **草稿为空、无附件、phase=plain** 时显示：此时光标必然在文档起点，不需要知道光标位置。
- 颜色取 `--dsw-alias-label-caption`（shell placeholder 用的同一 token），字号/行高继承输入区。
- 最多显示 2 行，超出省略；完整建议仍在 P0 行里可读。
- ghost 本身不可选中、不进入 DOM 文本流（`pointer-events:none`）；`Tab` 键帽可点。
- **不显示 ghost 的时机**：非空草稿（任何输入即消失）、IME 组合中、slash/command 菜单打开、附件条非空、多行草稿。

### 2.3 两者共存规则

1. 同一时刻只显示一条建议、一个来源（共享同一个请求与 AbortController）。
2. 空草稿 + composer 聚焦 → P1 ghost；P0 行收起为「建议：… [×]」或完全隐藏（二选一，建议保留 `×` 以便拒绝）。
3. 空草稿 + composer 未聚焦 → 只有 P0 行（此时 Tab 没意义，点击采用是主路径）。
4. 非空草稿 → 两者都消失；用户回到现有的 ✨ 按钮流程（本插件已有，负责增强已有草稿，与 Trae 同类）。
5. 采纳后 ghost/行立即消失，草稿变为非空，✨ 按钮解锁。

---

## 3. 采纳行为（关键：不能变成误操作）

### 3.1 采纳 = 只写草稿，不发送

- 采纳动作只有一件事：把建议文本写进真实草稿。
  - 首选 `inputActions.captureInsertion()` 拿 `{start, end, draftRev}`，再 `inputActions.insertText(text, span)`：一次撤销步、自动 CAS（`draftRev` 不符返回 `false`，此时放弃采纳并重新生成）。空草稿时光标在起点，等价于插入全文。
  - 备用 `inputActions.setDraft(text)`（整段替换）；但它「merged into history」，不产生独立撤销步，撤销体验差，只在 `insertText` 不可用时兜底。
- **绝不调用 `inputActions.submit()`**：DSH 空输入本来就禁止发送（发送按钮 `primaryDisabled = empty || …`），采纳后必须让用户自己按 Enter。这条要写进验收（Claude Code 的 2.1.136 修复就是反例：空输入 Enter 把 ghost 提交了〔研究文档 §2.3〕）。
- 采纳后保持输入框焦点与光标在文本末尾；用户可以直接继续改或 Enter 发送。

### 3.2 采纳键：点击是保证路径，Tab 是增强

| 方式 | 行为 | 实现 |
|---|---|---|
| 点击「采用」/ `Tab` 键帽 | 采纳 | P0/P1 组件上的 click；`onMouseDown` 里 `preventDefault()` 保住编辑器焦点（与 shell 工具栏 `keepFocus` 同款手法） |
| **Tab**（composer 聚焦、ghost/行可见） | 采纳 | `window` capture 阶段 keydown 拦截，严格守卫后 `preventDefault()`（见 §5.1） |
| Esc | 关闭当前建议 | 沿用插件现有 window keydown 模式 |
| 开始打字 | 立即消失 + abort | `useInput(s => s.draftRev)` 变化即作废 |

- **不接受**：`Shift+Tab`（焦点回退）、`Enter`（发送/换行，不能顺手当采纳，避免误提交）、方向键。
- Tab 守卫不满足时**放行**（fail-open），宁可少一个快捷键，不能抢走键盘导航。
- 若 Tab 拦截在某个 DSH 版本失效：点击路径仍然完整；在建议条右侧同时显示 `Tab` 键帽，失效时用户会自然改用点击。

### 3.3 消失与冷却

- 打字 / 发送 / 切会话 / 草稿出现附件 / IME 开始组合 / 页面隐藏 → 立即消失并 abort。
- 点击 `×` 或 Esc → 本条消失；连续拒绝 5 条进入 10 分钟冷却（数值可配，机制参照 Claude Code 降频）。
- 生成失败静默（不弹错），隔轮再试。

---

## 4. DSH 扩展点映射（每一项都能指到具体 API）

| 需求 | 扩展点 | 契约依据 |
|---|---|---|
| P0 建议条的位置 | `conversation.input.dock`（list，session scope，「Full-width entries above the composer card」） | 运行中 Slot 表；插件现状已占用该 slot（`EnhanceDock`, order 5），直接加一个 order 3 的 occupant 或复用同一 occupant |
| P1 ghost 的位置 | `conversation.input.overlay`（list，session scope，「Floating entries rendered inside the resident composer card」） | 运行中 Slot 表；shell 在 `[data-composer-card]` 里先渲染 `<div class=overlayAnchor data-composer-overlay>`，CSS `position:absolute;height:0;inset:0 0 auto`，其子元素需自己绝对定位 |
| 放在卡片下方（备选） | `conversation.composer.dock`（list，「Ambient entries below the composer card」） | 运行中 Slot 表有活跃 occupants（activity/usage/devflow-phase）；适合「弱提示」，不建议与建议条混用 |
| 读草稿/相位/修订 | `props.useInput(sel)` → `draft / draftRev / phase / attachmentIds / occurrences / queue` | `dsh-client-ui-conversation` 的 `InputState` 契约（session-scope 标准 props） |
| 写草稿 | `props.inputActions.captureInsertion()` + `insertText(text, span)`；兜底 `setDraft(text)` | 同一契约的 `InputActions`；`insertText` 内部 CAS `span.draftRev !== rev` 返回 false |
| 判断「一轮结束」 | `props.useSession(s => s.running)`（running true→false）+ `props.useSession(s => s.blank)` | 客户端 `SessionSnapshot` 有 `running: boolean` / `blank: boolean`；另有 `useSessionStatus` 的 `SessionStatus.running` 可用 |
| 判断是否聚焦、是否 IME | 无公开 API；只能用 DOM 事件（`focusin/focusout`、`compositionstart/end`、`document.activeElement`） | `InputState` 没有 focused/composing 字段 |
| 视觉定位（P1） | `[data-composer-card]`（shell 自己鼠标处理用的公开 data 属性）+ 卡内 `[contenteditable="true"]` 根节点，`getBoundingClientRect()` 相对卡片定位；`ResizeObserver` 跟随高度变化 | shell 的 `onCardMouseDown` 明确用 `data-composer-card` / `[data-composer-overlay]` 做命中判断；不要依赖 CSS-module 哈希类名 |
| Tab 拦截 | 只能自己监听 DOM keydown（建议挂在 `window` capture，或 `[data-composer-card]` capture），严格守卫 | shell 的 `ComposerKeyboard.arbitrate()` 是 InputBar 私有（契约原文：「package-internal, never across a plugin boundary」），插槽组件拿不到 |
| 快捷键注册（备选） | `ctx.get("shortcuts").register({ id, defaults, regions:["editable"], resolve })` | 见 §5.2：**普通 Tab 注册不进去**，所以这条只用于将来加别的组合键 |
| 配置开关 | 插件行 `config:`（host）+ 客户端读取；设置 UI 可用 `settings.general.item` | 现有插件已用 config 块；`settings.general.item` 是官方偏好行插槽（locale/theme/Enter 均走它） |
| 生成建议 | 现有 host 路由新增 `stage:"suggest"`（复用 `collectSessionGrounding` 的最近对话 + 人设），客户端不碰模型 | 现有 `POST /dsh-composer-enhance/enhance` 协议扩展；密钥与审批语义留在 host |

---

## 5. 做不成 / 代价过高的部分，以及替代形态

### 5.1 真正的「光标处内联补全」：做不到（公开 API 边界）

- 公开的 `InputActions` 只有 `captureInsertion / insertText / setDraft / persistDraft / addAttachments / removeAttachment / pruneAttachments / submit`，**没有编辑器实例、没有光标位置、没有选区变化回调**。
- 能拿到 `LexicalEditor` 和 `arbitrate/space/paste/caretSpan` 的 `ComposerKeyboard` 明确标注为 InputBar 私有，跨插件拿不到。
- 结论：
  - 空草稿时（光标必然在起点）可以用 overlay **视觉模拟** ghost；
  - 非空草稿的「边打边补全 / 在光标处插入」**没有可行实现**，不列入范围。
- 替代：非空草稿走现有 ✨（增强已有文本，Trae 形态）；空草稿走 P0/P1 建议。

### 5.2 普通 Tab 不能通过快捷键系统注册

- `bindingIssue()`：无修饰键的绑定直接返回 `"modifier-required"`；且 `Tab` 在保留键列表里，带修饰键的 Tab 组合也会 `"reserved"`。
- Web 端可注册的组合被 `isWebBindingAllowed()` 收得很窄（Linux Web 实际只剩 `Ctrl+/`、`Ctrl+Shift+,`、`Ctrl+Shift+.` 三条）。
- 结论：Tab 只能走 DOM 拦截，属于**跨版本脆弱点**；所以采纳主路径必须是点击。将来看是否需要给「采纳」配一个官方允许的组合键，可走 `shortcuts.register`（带 `resolve()` 做可用性判断），但**不要指望 Tab**。

### 5.3 内联 ghost 与 shell placeholder 抢同一位置

- shell 在 `draft === "" && attachments.length === 0 && !claimActive` 时渲染自己的 `.placeholder`（`position:absolute; inset:4px 8px auto 14px`），**没有公开 API 可以隐藏它**。
- 替代 A（推荐）：ghost 层用卡背景 token（`--dsw-specific-input-major`）做不透明底，正好盖住 placeholder 文字，视觉上等于「placeholder 换成了建议」。
- 替代 B：不做内联 ghost，只用 P0 行（零冲突）。
- 风险：主题若让卡片背景透明/渐变，遮罩会露馅；用主题 token 而不是写死颜色，并在亮/暗两主题各验一张图。

### 5.4 输入卡片不会因 ghost 长高

- overlay 是绝对定位层，不参与布局；长建议会压到工具栏上。
- 替代：ghost 限 1–2 行（`-webkit-line-clamp`），全文放 P0 行；建议生成 prompt 里限制长度（例如 ≤60 字）。

### 5.5 采纳后无法保证焦点回到编辑器

- 公开 `InputActions` 没有 `focus()`（host 侧 `SessionInput.focus()` 不暴露给插槽）。
- 替代：① 采纳控件的 `onMouseDown` 里 `preventDefault()`，保持编辑器焦点（用户本来就是从输入框按 Tab/点的，通常仍聚焦）；② 未聚焦时用 `[data-composer-card] [contenteditable="true"]` 做 best-effort `focus()`（公开 data 属性 + 标准属性，不碰哈希类名）；③ 兜底让用户点一下输入框。

### 5.6 建议来源无法传给模型

- DSH 输入契约没有 message metadata 通道，采纳后的文本对模型与用户手打**完全不可区分**（Claude Code 社区同样卡在 provenance，issue #60087〔研究文档 §2.4〕）。
- 替代：UI 层在草稿旁标一个「来自建议」小徽标（随第一次编辑消失）；不伪造元数据。若要模型感知，需要协议层扩展，列为后续项。

---

## 6. 建议生成时机与客户端状态机

```
IDLE ──(session.running:true→false && draft=="" && !blank && visible)──► DEBOUNCE(600ms)
  ▲                                                                        │
  │                                                        ┌───────────────┤
  │                                                        ▼               │
  │                                                     REQUEST ──(abort/失败/超时 12s)──► IDLE
  │                                                        │ 成功
  │                                                        ▼
  │                                                     SHOWN {text, draftRev, sessionId, turnSeq}
  │   ┌── 打字(draftRev变)/发送/切会话/附件/IME/页面隐藏 ──┘
  │   ▼
  │ DISMISSED ──(连续拒绝≥5)──► COOLDOWN(10min)
  │
  └── ACCEPT (click/Tab) ──► captureInsertion+insertText ──► IDLE（草稿非空）
```

- 单飞：同一时刻最多一个建议请求；新请求先 abort 旧的。
- 请求体带 `draftRev`、`sessionId`、`turnSeq`；响应回来时三者和当前值全等、且草稿仍为空、`running === false` 才显示，否则丢弃。
- 页面 `visibilityState !== "visible"`、切到别的会话、正在提交（phase≠plain）都不发起。
- 两次生成最小间隔 10s；被拒绝降频；失败静默。
- 触发源用 `useSession(s => s.running)` 的边沿，不用轮询/定时器。

### 6.1 Host 协议扩展（沿用现有两阶段路由）

```jsonc
// 请求
{ "stage": "suggest", "sessionId": "…", "draft": "" }
// 响应
{ "ok": true, "stage": "suggest", "engine": "0.2.1-m1",
  "suggestion": "把 README 的安装章节改成只保留 pnpm 一种方式",
  "contextUsed": ["recentTurns", "systemPrompt"] }
```

- 复用 `collectSessionGrounding`（最近对话 + 人设）；prompt 要求：「根据最近对话，写用户接下来最可能想发的**一条**消息；中文；≤60 字；具体、可直接发送；不要解释、不要引号」。
- 失败不外显；不得复用 `stage:"fast"` 的 gate 逻辑（建议不是改写）。

---

## 7. 验收清单（可直接转成测试用例）

**功能**
1. 一轮回复结束、草稿为空 → 600ms 后出现 P0 建议条；响应慢/失败时不出现、不报错。
2. 打字、发送、切会话、加附件、页面隐藏、IME 组合 → 建议立即消失且请求被 abort。
3. 点击「采用」→ 草稿等于建议文本；**未发送**；焦点仍在输入框；一次撤销可回到空草稿（若用 `insertText`）。
4. Tab（composer 聚焦 + 草稿空 + 建议可见）→ 采纳；`Shift+Tab` 正常回退焦点；slash 菜单/IME 打开时 Tab 不抢键。
5. Esc / × → 关闭；连续拒绝进入冷却；冷却期不再出现。
6. 非空草稿 → 不出现建议；✨ 按钮行为不受影响。
7. 草稿在请求期间被输入 → 响应被丢弃，不覆盖用户内容（`draftRev` CAS）。
8. P1：亮/暗主题下 ghost 颜色为 `--dsw-alias-label-caption`，placeholder 被完全遮住；2 行截断；卡片高度不变、不压工具栏。

**回归**
9. 现有 125 项离线测试全绿；建议状态机新增的纯逻辑（CAS、降频、abort）进离线测试（fake `useInput`/`inputActions`）。
10. 真机：采纳后立即按 Enter 发送的是建议文本（不是空、不是旧文本）。

---

## 8. 实施顺序

1. ✅ **P0（已实现）**：host 加 `stage:"suggest"` + prompt（`normalizeSuggestion` 11 项离线用例）；客户端 `conversation.input.dock` 建议条（点击/Tab 采纳 + × + 冷却）；`insertText` 写入 + CAS；`useSession.running` 触发；单飞/abort/抑制/TTL。
2. **P1**（约 1 天）：`conversation.input.overlay` ghost 层（`[data-composer-card]` 量测定位 + placeholder 遮罩）+ Tab capture 守卫 + 亮暗主题验收。
3. **P2**（后续）：`settings.general.item` 开关行、provenance 徽标、CJK/IME 专项、频率参数配置化、若需要模型感知来源再扩 host 协议。

---

## 9. 证据索引（本机 dsh 0.2.1-rc.2）

| 结论 | 证据位置 |
|---|---|
| 三个候选 slot 的 kind/scope/用途 | 运行中 Slot 表（`Slots.listSubTree`）：`conversation.input.dock`、`conversation.composer.dock`、`conversation.input.overlay`；overlay 现有 occupants：slash-menu / command-popup / feedback-dialog |
| overlay 渲染在卡片内、绝对定位、零高度 | `@deepseek-ai/dsh-client-ui-conversation/lib/client.js`：`overlayAnchor` CSS（`position:absolute;height:0;inset:0 0 auto`）与 `[data-composer-card]` 渲染分支 |
| 卡片鼠标处理识别 overlay、`data-composer-card` | 同文件 `onCardMouseDown`：`target.closest("[data-composer-overlay]")` / `[data-composer-card]` |
| placeholder 的显示条件与位置 | 同文件：`showPlaceholder: draft === "" && attachments.length === 0 && !claimActive`；`.placeholder{inset:4px 8px auto 14px; color:var(--dsw-alias-label-caption)}` |
| `InputActions` / `InputState` 字段 | `@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/input.d.ts` |
| `ComposerKeyboard` 私有（editor/caretSpan/arbitrate 拿不到） | 同目录 `draft-editor.d.ts` 顶部注释与接口说明 |
| `insertText` CAS、`setDraft` 不产生独立撤销步 | `lib/client.js` 的 `SessionInputShell` / `DraftEditorRuntime` 实现 |
| session 级 `useInput`/`inputActions`/`useSession` 标准 props | 运行中 Slot 表 `standardProps`；`SessionSnapshot.running/blank` 在 `@deepseek-ai/dsh-api-session-controller/lib/types/client/contract/snapshot.d.ts` |
| Tab 不能注册为快捷键 | `@deepseek-ai/dsh-client-shortcuts/lib/protocol.js` 的 `bindingIssue()`（`modifier-required` / `Tab` reserved）与 `isWebBindingAllowed()` |
| 三家产品交互事实与研究来源 | [ux-research-cc-codex-trae.md](ux-research-cc-codex-trae.md) |
| 现有插件槽位注册方式 | [../src/client/index.tsx](../src/client/index.tsx) |
