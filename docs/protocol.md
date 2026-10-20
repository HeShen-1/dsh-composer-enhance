# dsh-composer-enhance 协议（M2 冻结版）

host 与 client 之间**唯一**的接口契约。两边都必须照此实现；改协议先改本文件。

## 传输

| 项 | 值 |
|---|---|
| 路由 | `POST /dsh-composer-enhance/enhance`（`webServer.register({kind:'exact'})`） |
| 编码 | `application/json; charset=utf-8` |
| 鉴权 | **M2 待补**：当前路由不受页面鉴权保护，M2 必须校验会话身份 |
| 失败约定 | HTTP 一律 200，错误放在 body 的 `ok:false` + `reason`，便于客户端统一处理；只有请求本身畸形才 400 |

## 请求

```jsonc
{
  "sessionId": "string",          // 用于解析模型路由与读取会话上下文
  "stage": "fast" | "slow" | "suggest", // fast = 低档；slow = 高档复核；suggest = 空草稿的下一步建议
  "draft": "string",              // 当前草稿原文；slow 传快轨产出；suggest 必须是 ""
  "baselineDraft": "string",      // 仅 slow，用于让 host 判断客户端草稿是否已变（可选）
  "questions": [                  // 已问过的问题回显；没问过就是 []
    { "id": "q1", "question": "…", "options": [{ "label": "…", "recommended": true }] }
  ],
  "answers": { "q1": ["选项文本"] },   // 用户选择；未答的问题不出现
  "options": {
    "includeMemory": false        // M3：是否额外检索 memory MCP
  }
}
```

## 响应

```jsonc
{
  "ok": true,
  "stage": "fast",

  // —— 门控结果（每个 fast 请求都返回）——
  "gate": {
    "hasAmbiguity": true,
    "ambiguityType": "semantic" | "specify" | "generalize" | "none",
    "reason": "一句话说明这个歧义为什么会改变产出",   // 给用户看的，必须具体
    "shape": "chips" | "panel" | "none",
    "chips": [{ "label": "…" }],                    // shape=chips 时，2–4 个
    "questions": [                                  // shape=panel 时，1–3 个
      { "id": "q1", "header": "≤12字符", "question": "…",
        "options": [{ "label": "…", "description": "…", "recommended": true }] }
    ]
  },

  // —— 下一步建议（仅 stage=suggest）——
  "suggestion": "一条 ≤160 字的建议文本（单行，无引号/前缀）",

  // —— 改写结果（shape=none 或带 answers 时才有）——
  "draft": "改写后的正文",
  "issues": [ { "kind": "added" | "clarified" | "restructured" | "assumption", "text": "改了什么" } ],
  "assumptions": ["未确认但按默认处理的点"],

  // —— 本次实际用了哪些上下文（M3 起在 UI 上显示）——
  "contextUsed": ["systemPrompt", "recentTurns", "projectMemory", "runtimeContext", "environment"],

  "route": { "provider": "…", "model": "…", "reasoningEffort": "…" }
}
```

### 环境清单接地（fast 阶段，gate + rewrite 共用）

`test/handler-smoke.mjs` 与 `test/environment-smoke.mjs` 钉住的回归：草稿
`使用dsh-mnemon插件工具记录项目情况，然后把 /karpathy-guidelines 保存到AGENTS.md；`
曾被闸门当成「/karpathy-guidelines 是什么」来反问——模型不知道它是已安装的技能，只能当文件路径猜。

- host 在 `stage:fast` 时从三个活服务读清单，**只塞给 gate 与 rewrite**（suggest 不付这份钱）：
  - `ctx.skills.list({ cwd })`：技能名 + 一句话描述（每条描述截 60 字，整行上限 2400 字）；
  - `ctx.commands.list(agent)`：斜杠命令名 + 描述（截 40 字，整行上限 700 字；拿不到 agent 就跳过）；
  - `ctx.pluginManager.listPlugins()`：启用中的插件 moduleName（整行上限 900 字；禁用项跳过）。
- 渲染成 `【当前 DSH 环境（已安装的真实实体，不是文件路径）】` + `- 技能：…` / `- 斜杠命令：…` / `- 插件：…`；
  任一类为空就不出那一行，三类都空就整块不出现（部署缺服务时静默降级，不影响请求）。
- 闸门 prompt 增加硬规则：清单里的名字是真实实体，草稿提到它们时按对应实体理解，**禁止**追问
  「这是什么」；这类引用本身不构成歧义，只有同一个名字可能指两个不同事物、或处理动作不明确时才问。
- 响应 `contextUsed` 增加 `"environment"`。

### suggest 阶段（Web 建议条 P0）

- 触发方：客户端在「一轮回复结束（`running` true→false）+ 草稿为空 + 非 blank 会话 + 页面可见」时请求；
  host 只负责生成，不判断触发条件。恢复路径：聚焦空的 composer、切回可见标签页也会重新触发；
  被 10s 最小间隔挡住时会**排到间隔到期再请求**，不是直接丢弃。
- 请求：`{ "sessionId": "…", "stage": "suggest", "draft": "" }`；**非空 draft 一律 400 bad-request**。
- 用最近对话 + 人设/项目约定接地，模型只输出一条文本；host 侧 `normalizeSuggestion()` 去掉围栏、引号、
  「建议：」前缀、折行，并截断到 160 字。空结果返回 `ok:false, reason:"empty-result"`。
- 客户端只在响应返回时草稿仍为空、`draftRev` 未变、`running === false` 时显示；否则丢弃。
  采纳只写草稿（一次 `insertText`，不发送）；拒绝/打字/发送/切会话/隐藏页面都会作废它。
- 失败（传输/HTTP/`ok:false`/空结果）**重试一次**；第二次失败才彻底安静。显示中的建议**没有 TTL**：
  它一直留到用户输入、发送、采纳、关闭或切换会话（0.2.0 的 60s 到期被实测读成「等一会提示就没了」的 bug）。

`ok:false` 时：

```jsonc
{ "ok": false, "reason": "no-route" | "bad-request" | "model-error" | "empty-result" | "stale", "message": "给人看的中文说明" }
```

## 状态机（client 侧）

```
idle ──点✨──► gate(fast) ──shape=none──────────────► writing ─► done(改动清单 + 还原)
                    │
                    ├──shape=chips──► chips 行 ──用户点/自填──┐
                    └──shape=panel──► 面板   ──提交──────────┴──► gate(fast)+answers ─► writing ─► done
done ──(仅当本轮闸门问过)──► slow 复核 ──安全阀全过──► 自动替换（改动清单 + 还原到快轨版）
                          └─未过──► 只提示「更严格的版本可用」
```

- 草稿一直是唯一事实源：任何阶段草稿与 baseline 不一致，整条流程立即作废。
- `setDraft` 只在最后落字一次。
- 还原按钮把草稿写回 `baselineDraft`。

## 分级澄清的门槛（写进 prompt 的要求）

| 情况 | shape | 依据 |
|---|---|---|
| 缺失信息能从句内、会话上下文、项目约定推出 | `none` | 推断得出来的不算缺口 |
| 缺一个可选值/口径，选项能穷举 | `chips` | 2–4 个一键项，零输入成本 |
| 多个互相独立的缺口，或缺口会实质改变产出结构 | `panel` | 最多 3 题，按影响排序 |

**默认偏向 `none`**：能不问就不问，因为每次弹问题都在收"体验税"。

### chips 的回传约定

用户点了一个 chip 后，客户端**不要**伪造 `questions`，直接把选择放进 `answers`，键固定为 `chips`：

```jsonc
{ "draft": "原草稿", "stage": "fast", "answers": { "chips": ["REST + JSON"] } }
```

host 遇到非空 `answers` 时**直接改写、不再过闸门**，所以不存在"问了又只能再问"的循环。
因此客户端那套"最多 2 轮后判失败"的兜底永远不该触发；触发了就是真 bug，要报出来而不是静默吞掉。

> 这条曾经只是文档意图，代码没实现：早期版本把"已回答"判断成 `questions.length > 0`，于是 chips 回复（`questions: []`）会被重新闸门化，用户永久卡住。真机复现后已修，并由 `test/handler-smoke.mjs` 断言钉住（chips 回复只允许**一次**模型调用，且那次必须是改写）。

## 常量

| 名称 | 值 |
|---|---|
| 路由 | `/dsh-composer-enhance/enhance` |
| 插槽 | 按钮 `conversation.input.right` order 10；建议条/面板 `conversation.input.dock` order 5；内联 ghost `conversation.input.overlay` order 5 |
| 问题上限 | 3 |
| 选项上限 | 5 |
| chips 上限 | 4 |
| 请求体上限 | 16 MiB |
| 慢轨自动替换窗口 | 30s（且草稿仍聚焦、未被编辑、issues 非空、文本确有变化）。8s 在真机上把自动替换这条分支实际关掉了：`effort: max` 实测延迟 1.2s–9.5s |
| 慢轨触发条件 | **仅当本轮闸门确实问过**（客户端 `rounds > 0`，即走过 chips 或 panel）。真机 4 次复核的 issues 是 0/0/2/0——对无歧义草稿做复核多数时候没话说，不值得每次 ✨ 都付一次 `effort: max` |
| 建议文本上限 | 160 字（host `MAX_SUGGESTION_CHARS`；客户端显示一行，2 行截断） |
| 建议生成间隔 | 触发/聚焦/回到可见页后 700ms 防抖；两次请求最小间隔 10s（被挡住的尝试会排到到期再发，不丢弃）；显式拒绝后静默 60s；连续拒绝 5 次冷却 10 分钟；显示无 TTL，留到用户操作 |
| 环境清单上限 | 技能 2400 字（描述每条 ≤60 字）、斜杠命令 700 字（≤40 字）、插件 900 字；只注入 fast 阶段 |
