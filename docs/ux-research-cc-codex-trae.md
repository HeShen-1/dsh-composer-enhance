# Claude Code / Codex / Trae「输入框提示词增强」交互研究

> 研究日期：2026-10-19。范围：三款产品输入框里的「提示词建议 / 优化」真实交互，以及能直接喂给 dsh-composer-enhance 的工程约束。
> 目的：为插件下一步 UX（尤其是「空输入时灰色建议 + Tab 接受」）提供带来源的设计输入。
> 证据分级见第 1 节；每条结论后面标了等级，找不到可靠来源的明确写「未找到可靠来源」。

---

## 0. TL;DR

1. **Claude Code**：这套「灰色 ghost + Tab 接受」是官方功能 **Prompt suggestions**。输入框为空时灰色显示；**Tab 或 →** 把建议放进输入框，再按 **Enter** 提交；**一开始打字就消失**。建议由**后台模型请求**生成（复用会话 prompt cache，计入额度/费用）；会话开场那条灰色示例不同，是从 **git 历史**挑的本地启发式。可关闭：`/config` 开关、`promptSuggestionEnabled` 设置、`CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false` 环境变量。〔官方〕
2. **Codex**：要分成两条产品线。**Codex CLI** 输入框里的灰字是**placeholder（占位提示）**，不是生成式建议，也没有可接受语义；OpenAI 员工确认已把轮换的示例 placeholder 换成中性占位语。〔官方 issue 回复 + 社区源码分析〕**Codex 桌面 app** 在 2026-10-09 上线 beta **Composer predictions**：每轮回复后可能给出「整条下一条消息」，**Tab 接受可编辑、不会自动发送**，默认开，Settings → General → Composer → Show predictions 可关，beta 期生成不计费。能力范围远窄于 Claude Code（仅个人 Pro、Codex 桌面 app 的本地/SSH 线程、指定模型）。〔官方帮助中心 + 媒体转述〕
3. **Trae**：没有 ghost 文本，是**显式按钮 + 原地改写**。官方文档：输入问题后点**模型名称右侧**的「优化输入内容」图标；官方更新文章（2025-08）说位置在**右下角模型与语音输入之间**，一键优化，**结果可修改，再次点击可撤销优化**。是 AI 生成（模型优化），点击触发。快捷键、对比视图、空输入行为：**未找到可靠来源**。〔官方文档 + 官方更新文章〕
4. **三家共同结论**：建议都在**一轮回复结束后**（或点击时）生成，**不跟敲键实时生成**；ghost 不进入真实草稿，**接受是显式动作**（Tab/→ 或点击），接受后仍需再按 Enter 才发送；都有/需要**关闭开关**；未使用会被降频或直接消失。Claude Code 的 changelog 里还留着三条直接对应「防抢输入、防误提交」的修复记录，是现成的验收用例。〔官方 changelog〕

---

## 1. 方法与证据分级

- 只使用官方文档、官方 changelog、官方帮助中心、官方仓库 issue 中的员工回复，以及可靠媒体/开发者实测与 GitHub issue 的社区观察。
- 打标约定：
  - **〔官方·文档〕**：官方产品文档（code.claude.com、docs.trae.cn、help.openai.com）。
  - **〔官方·changelog〕**：官方发布日志（anthropics/claude-code CHANGELOG）。
  - **〔官方·issue 回复〕**：官方仓库里 OpenAI/Anthropic 员工或 CONTRIBUTOR 身份的回复。
  - **〔官方·文章〕**：官方账号发的产品更新文章（如火山引擎开发者社区的 TRAE 更新）。
  - **〔社区·issue / 社区·文章〕**：用户 issue、论坛、博客、媒体实测；只当旁证。
  - **〔推测〕**：本文基于事实做的推断，非来源事实。
- 抓取限制需要说明：`help.openai.com` 与 `openai.com` 的发布说明页有 Cloudflare/抓取端限制，本文中这两处的细节来自搜索引擎索引摘要 + 媒体转述（URL 照列，等级标为「官方·帮助中心（摘要）」或「媒体」）。Trae 英文文档页体量过大未完整拉取，使用中文官方文档为准。

---

## 2. Claude Code：Prompt suggestions（灰色 ghost + Tab）

### 2.1 先分清两种「灰色提示」

它们长得像，但机制完全不同：

| 类型 | 何时出现 | 内容来源 | 机制 |
|---|---|---|---|
| **会话开场示例** | 刚打开会话、输入框空时 | 你的项目 **git 历史**里最近在改的文件 | 本地启发式，不是模型〔官方·文档〕 |
| **轮后建议（本文主角）** | Claude 回复完之后 | 当前对话上下文（多步任务的下一步 / 自然延续） | **后台模型请求**生成〔官方·文档〕 |

原文：「When you first open a session, Claude Code shows a grayed-out example command in the prompt input… It picks this from your project's git history」；「After Claude responds, Claude Code can suggest your next prompt based on your conversation history」。来源：<https://code.claude.com/docs/en/interactive-mode#prompt-suggestions>〔官方·文档〕

### 2.2 官方交互规格

| 维度 | 规格 | 来源 |
|---|---|---|
| 功能名 | **Prompt suggestions** | 文档、`/config` 开关名 |
| 触发条件 | 每轮回复结束后（不是敲键时）；会话开场另有一条 git 历史示例 | 文档 |
| 呈现 | 输入框内**灰色（grayed-out）ghost 文本** | 文档、env-vars 描述 |
| 接受键 | **Tab** 或 **→（Right arrow）** 把建议放进输入框；再按 **Enter** 提交 | 文档 |
| 拒绝/消失 | **开始打字即消失**（Start typing to dismiss it） | 文档 |
| 是否自动发送 | 接受后不自动发送，需再按 Enter；历史版本曾允许 Enter 直接接受并提交，后来修掉了 | 文档 + changelog |
| 生成方式 | 对**同一会话模型**发一条短的后台请求；复用会话 prompt cache（大头是 cache read + 少量输出 token） | 文档 |
| 成本 | 计入套餐用量 / API 费用（因为复用 cache，官方称 added cost is small） | 文档 |
| 频率衰减 | 连续 **20 条未使用**后出现频率降低，提示 `Showing fewer prompt suggestions · use one to bring them back`；用一条可恢复 | 文档 + changelog 2.1.283 |
| 跳过条件 | prompt cache 冷；部分会话首轮之后；上一轮以错误结束；Plan mode 中；接近/达到用量上限；agent team 中队友会话默认不显示（lead 显示） | 文档 `When Claude Code skips suggestions` |
| 关闭方式 | ① `/config` 里 **Prompt suggestions** 开关；② 设置文件 `promptSuggestionEnabled: false`；③ 环境变量 `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false`（优先级高于设置）；④ 托管设置可组织级关闭 | 文档 + <https://code.claude.com/docs/en/env-vars> + <https://code.claude.com/docs/en/settings-reference#promptsuggestionenabled> |
| 非交互模式 | 默认不生成；需 `--prompt-suggestions` 且配合 `-p --output-format stream-json --verbose`，emit `prompt_suggestion` 消息 | <https://code.claude.com/docs/en/cli-reference> |
| SDK | Agent SDK 选项 `promptSuggestions`，**默认 false**，开启后每轮 emit `SDKPromptSuggestionMessage` | <https://code.claude.com/docs/en/agent-sdk/typescript> |
| 第三方 provider | 不拉 feature flag 的会话（第三方 provider、Claude apps gateway）里默认关闭且 `/config` 开关被隐藏 | 文档 |

关键官方原文（环境变量表）：「Set to `false` to turn off prompt suggestions, the **grayed-out predictions** that appear in your prompt input.」——这句同时确认了「灰色」「预测」两个描述。来源：<https://code.claude.com/docs/en/env-vars>

### 2.3 官方 changelog 里值得抄的演进（都是「踩坑后修」）

来源统一为 <https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md>〔官方·changelog〕：

| 版本 | 记录 | 对实现的含义 |
|---|---|---|
| 2.0.70 | Added **Enter key to accept and submit** prompt suggestions immediately（tab still accepts for editing） | 曾允许一键接受并提交 |
| 2.0.70 | Fixed prompt suggestions **replacing typed input when pressing Tab** | Tab 接受不得覆盖用户已输入内容 |
| 2.0.71 | Added `/config` toggle to enable/disable prompt suggestions | 必须可关闭 |
| 2.1.136 | Fixed prompt suggestions being **auto-submitted by Enter on an empty input** instead of requiring Tab or arrow to accept | 空输入按 Enter 不得把 ghost 当真实输入提交 —— 直接对应本文第 6.5 节 |
| 2.1.238 | Fixed `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=true` not keeping suggestions on near usage limit | 开关语义要稳定，别被其他 gating 静默覆盖 |
| 2.1.269 | Improved suggestion **filtering for Chinese/Japanese/Korean**：混排、单词建议保留，meta/evaluative 文本丢弃；同版本修了中日泰等无空格语言建议被丢的问题 | 中文建议必须单独做过滤/断词测试 |
| 2.1.283 | 连续 20 条未用后降频 | 降噪机制可直接借鉴 |

### 2.4 社区观察（只能当旁证）

- **桌面版回归**：2026-10 有 issue 报「Code tab 每轮回复后的 ghost 建议不再出现」「设置仍为 On」，说明桌面 app 与 CLI 共用能力但实现并不完全同步。<https://github.com/anthropics/claude-code/issues/98971>、<https://github.com/anthropics/claude-code/issues/103335>〔社区·issue〕
- **接受提示缺失**：用户不知道 ghost 可以 Tab 接受，请求在 ghost 尾部加键帽提示（如 `Tab` badge）。<https://github.com/anthropics/claude-code/issues/76591>〔社区·issue〕——这条直接支持「ghost 必须带可见的接受提示」。
- **provenance 问题**：Tab 接受后发送的消息，模型看到的与用户手打**完全无法区分**；建议在 transcript / metadata 里带 `source: suggestion|typed|mixed` 标记。这不是 bug，是设计缺口。<https://github.com/anthropics/claude-code/issues/60087>〔社区·issue〕——对本插件意味着：接受 ghost 后最好保留「建议来源」的 UI 标记，别让它冒充用户原创。
- **静默抑制**：限流 `allowed_warning` 状态下建议会被静默吞掉，官方文档没覆盖该分支。<https://github.com/anthropics/claude-code/issues/72495>〔社区·issue〕
- **关闭开关曾失效**：`/config` 显示 false、env 也设了 false 仍出现建议的旧 bug。<https://github.com/anthropics/claude-code/issues/14629>〔社区·issue〕

### 2.5 Claude Code 小结

它是目前唯一公开了「空输入灰色 ghost + Tab 接受 + 打字即消失 + 模型生成 + 频率衰减 + 多级关闭」完整规格的产品。设计上最值得抄的不是视觉，而是四条纪律：**只在空/未编辑时显示、接受是显式动作、不接受不写入、可关闭可降噪**。

---

## 3. Codex：CLI 是 placeholder，桌面 app 才是预测

### 3.1 Codex CLI：输入框灰字不是建议，是 placeholder

- 用户报告：Codex CLI（0.94.0）一打开就有灰色 inline 文本，想关关不掉；`codex features list` 里没有 suggestion 相关开关。<https://github.com/openai/codex/issues/10562>〔社区·issue〕
- 社区源码分析：灰字是 **composer 的 placeholder**，启动时从 8 条示例 prompt 中随机抽一条渲染；`[features] suggestions_feature = false` 自然无效。<https://github.com/openai/codex/issues/10562#issuecomment-5176933787>〔社区·issue〕
- **OpenAI 员工（etraut-openai，CONTRIBUTOR）确认**：「Based on feedback, we've decided to **remove the rotating placeholders**, which users found confusing. We've replaced it with a generic placeholder message.」<https://github.com/openai/codex/issues/13466#issuecomment-5211502344>〔官方·issue 回复〕
- 结论：**截至研究日，Codex CLI 没有生成式 prompt suggestion / ghost 接受机制**；灰字没有「接受」语义，按 Tab 也不会把它变成输入。此前相关功能请求（context-aware autocomplete/suggestion）在仓库里被关闭（not planned）。<https://github.com/openai/codex/issues/13714>（其中提到 #2616 已 closed as not planned）〔社区·issue〕

### 3.2 Codex 桌面 app：Composer predictions（beta，2026-10-09）

官方帮助中心文章：<https://help.openai.com/en/articles/20001601-composer-predictions-in-codex>（中文版：<https://help.openai.com/zh-hans-cn/articles/20001601-composer-predictions-in-codex>）〔官方·帮助中心（摘要）〕

| 维度 | 规格 |
|---|---|
| 名称 | **Composer predictions**（beta） |
| 触发 | Codex 完成回复后，消息框里**可能**出现一条「你下一条想说的话」；不保证每条回复都有（官方称可能 skip、长线程里要等几秒） |
| 内容 | 基于**当前 Codex 线程的对话**；不主动查 memories、不检索连接的 app |
| 呈现 | 消息框内文本（被媒体描述为「writing it into the message box」）；**不是边打边补全的 autocomplete**，beta 期是整条下一消息 |
| 接受 | **Tab** 把文本放进输入框；之后可编辑、可直接丢弃 |
| 是否自动发送 | **接受不会自动发送**；要自己再按发送 |
| 关闭 | Codex 桌面 app → Settings → General → Composer → **Show predictions** 关闭/开启 |
| 默认 | 对 eligible 用户**默认开** |
| 成本 | beta 期间生成**不计入** Codex 使用额度、不消耗 credits；发送后照常计费 |
| 资格 | 据媒体转述：18+、个人 ChatGPT Pro、Codex 桌面 app 的本地/SSH 线程、GPT-6 Astra / GPT-6.1 Sol；网页版 Chat 不出现 |

来源：官方帮助中心（上）+ 媒体实测 <https://mixed-news.com/en/codex-composer-predictions-beta-on-by-default-tab-to-accept/>〔媒体〕、<https://alphasignal.ai/news/openai-s-codex-now-predicts-your-next-coding-command-before-you-type>〔媒体〕。OpenAI 发布说明 2026-10-09 条目的原文（经检索摘要）：「Press Tab to accept it, then review or edit it before sending. Accepting a suggestion doesn't send it automatically.」来源页：<https://help.openai.com/en/articles/6825453-chatgpt-release-notes>〔官方·发布说明（摘要）〕

### 3.3 Codex 两条线的差异

| | Codex CLI | Codex 桌面 app |
|---|---|---|
| 输入框灰字 | placeholder，**无建议语义** | **Composer predictions**，可 Tab 接受 |
| 生成方式 | 不生成（随机抽示例 → 已改中性 placeholder） | 模型基于当前线程生成（官方未公布模型细节，媒体称按线程对话；〔推测〕为模型生成） |
| 接受/拒绝 | 无 | Tab 接受、可编辑/丢弃、不自动发送 |
| 可关闭 | placeholder 曾无法关闭（员工回复称已移除轮换） | Show predictions 开关 |
| 成本 | 无 | beta 期不计费 |

### 3.4 社区观察

- Codex CLI 的 placeholder 被大量用户当成「建议」并抱怨不可关闭、不可配置、无无障碍支持（屏幕阅读器每次都读）；关闭请求以「upvotes 不够」被关。<https://github.com/openai/codex/issues/10562>〔社区·issue〕
- 这说明：**把「占位提示」做得像「建议」是反模式**——用户会以为可以接受，但 Tab 无效。对本插件：ghost 必须要么真可接受，要么明确写成 hint。

---

## 4. Trae：显式按钮 + 原地改写（没有 ghost）

### 4.1 官方文档（当前版本）

「输入问题后，可以点击**模型名称右侧**的 **优化输入内容** 图标，让 AI 帮你优化指令，使其更清晰、更易于理解。」<https://docs.trae.cn/ide_chat.md>（同页 <https://docs.trae.cn/ide_chat>）〔官方·文档〕

可确认：
- 操作对象是**已输入的提问内容**（「输入问题后」）；
- 触发是**手动点击图标**，不是自动弹出；
- 结果是 AI 生成（「让 AI 帮你优化指令」）；
- 没有提到 ghost 灰字、对比视图、快捷键。

### 4.2 官方更新文章（2025-08-19，IDE + SOLO）

火山引擎开发者社区、豆包MarsCode 发布的 TRAE 更新：<https://developer.volcengine.com/articles/7540133366889513010>〔官方·文章〕

原文关键句：「TRAE IDE 模式和 SOLO 模式现都已支持对输入内容进行智能优化，提升指令精准度。……在对话框输入提示词，点击**右下角模型与语音输入之间的图标**，即可一键优化提示词；**优化后的结果支持修改，也可以通过再次点击撤销优化**。」

由此确认：
- 按钮位置：2025-08 版本在**右下角、模型选择与语音输入之间**；当前文档写成「模型名称右侧」——位置随版本/布局变，但都在输入区右侧模型/语音一带；
- 结果：**原地替换**，替换后可继续手动修改；
- 撤销：**再次点击同一图标**即可撤销优化（toggle 语义），不是撤销栈，也没有「接受/拒绝」二选一；
- 没有对比视图、没有 ghost。

### 4.3 社区观察（旁证，含时间敏感的存疑信息）

- SOLO 使用技巧（2025-11）：在 AI 对话输入框输入 Prompt 后点「优化输入内容」按钮自动优化；「你还可以**修改或者重试**」<https://juejin.cn/post/7573002274324545582>〔社区·文章〕——「重试」是文档没写的社区观察。
- TRAE 论坛（2026-10-18）：有用户问旧版「一键优化关键词」按钮在新版的去向，回复称「目前我查到的 TRAE 官方资料里没有关于『一键优化关键词』按钮的说明……目前新版是没有这个功能了」<https://forum.trae.cn/t/topic/325883/3>〔社区·文章〕。注意：讨论的是另一个旧按钮，且与当前官方文档仍记载的「优化输入内容」可能不是同一入口，**不能据此判断优化输入内容已下线**；只能说明「版本间入口有变动、社区信息不一致」。
- 官方快捷键表里没有「优化输入内容」的快捷键：<https://docs.trae.cn/ide_keyboard-shortcuts?lang=zh>〔官方·文档〕——列表中没有该动作，可视为「未提供快捷键（至少未文档化）」。

### 4.4 Trae 未找到可靠来源的点

- 空输入时点按钮会怎样（是否禁用/是否报错）：**未找到可靠来源**。
- 是否有并排/差异对比视图：**未找到可靠来源**（官方描述是原地替换 + 可修改）。
- 是否有快捷键：**未找到可靠来源**（官方快捷键表无此动作）。
- 结果生成耗时、超时/取消、失败重试的官方规则：**未找到可靠来源**（社区只说可「重试」）。
- 是否可关闭该功能：**未找到可靠来源**。

---

## 5. 三家横向对比

| 维度 | Claude Code | Codex CLI | Codex 桌面 app | Trae（IDE/SOLO） |
|---|---|---|---|---|
| 形态 | 空输入 ghost 文本 + Tab 接受 | placeholder（无建议语义） | 轮后整条预测 + Tab 接受 | 输入区右侧图标 + 原地改写 |
| 生成者 | 模型（后台请求，复用 cache）；开场示例是本地 git 启发式 | 不生成 | 模型（基于当前线程） | 模型（AI 优化） |
| 触发时机 | 每轮回复后；非敲键 | 打开即显示（已改为中性 placeholder） | 每轮回复后 | 用户点击按钮 |
| 是否需空输入 | 是（建议显示在空输入框；打字即消失） | 是（空 composer） | 是（空消息框） | 否（对已有内容操作） |
| 接受方式 | Tab / →，再 Enter 发送 | 无 | Tab，再编辑/发送 | 点击即替换 |
| 自动发送 | 否（历史版本曾 Enter 接受并提交，后修复） | — | **明确不会** | 否（只改草稿，仍需自己发送） |
| 撤销/拒绝 | 打字即消失；不接受则不写入 | — | 可编辑/丢弃 | **再点一次撤销优化**；社区称可重试 |
| 可关闭 | `/config` + settings + env + 托管 | 曾无法关（已移除轮换占位） | Show predictions 开关 | 未找到可靠来源 |
| 降噪 | 20 条未用降频 | — | 不保证每条都有 | — |
| 对比视图 | 无 | 无 | 无 | 未找到（官方描述为原地替换） |
| 快捷键（除接受） | 接受 Tab/→ | 无 | 接受 Tab | 未找到 |

---

## 6. 三家共同的工程约束（可直接转成验收项）

### 6.1 何时生成

- **不要在每次击键时请求模型。** Claude Code：每轮回复后由后台请求生成〔官方·文档〕；Codex：回复后生成，且官方说明可能 skip、长线程要等几秒〔官方·帮助中心（摘要）/媒体〕；Trae：点击才生成〔官方·文档/文章〕。
- 若产品形态必须实时（例如空输入即建议），把「触发条件」收窄为：**草稿为空 + 输入框聚焦或页面可见 + 非 busy + 非 IME 组合中 + 距离上次刷新超过间隔**，并做 **300–800ms 防抖**（Claude Code / Codex 都没有公开防抖数值，此值属〔推测〕建议）。
- **成本敏感时要跳过**：Claude Code 明确在 prompt cache 冷、上一轮报错、Plan mode、接近额度上限时跳过〔官方·文档〕。可当默认策略清单直接用。

### 6.2 取消 / 过期

- **用户一开始打字就取消并隐藏**（Claude Code：「Start typing to dismiss it」）〔官方·文档〕。
- **下一轮/下一次触发替换旧建议**；新请求发出前 abort 旧请求（Claude Code 未公开实现细节，但「per-turn suggestion」语义等价）。
- **频率衰减**：连续未使用时降频（Claude Code 20 条后降频）〔官方·changelog〕。
- 官方均未给出「固定 TTL 秒数」；TTL 是实现自选的〔推测〕。建议 TTL 20–60s，并与 draftRev / 轮次绑定。

### 6.3 不抢用户输入

- ghost 文本**不能是真实 draft 的一部分**：空输入时 ghost 不得让 `draft !== ""`，否则会被提交、计数、影响 placeholder/发送按钮状态〔推测，但 Claude Code 2.0.70「Tab 覆盖已输入文本」修复与 2.1.136「空输入 Enter 提交建议」修复都说明这是真实故障面〕〔官方·changelog〕。
- 接受时写入前做 **CAS**：`draftRev` 仍等于生成时记录的值、`phase === 'plain'`、草稿仍为空；否则放弃并重新生成。Claude Code 的 2.0.70 修复就是这条的教训。
- 已输入内容时**不显示** ghost（或显示也必须打字即消失），避免遮挡/误导。

### 6.4 接受 / 拒绝

- **接受是显式动作**：Tab / → / 点击；不接受则永不写入。〔官方·文档〕
- **接受后仍不发送**：Claude Code 需要再 Enter；Codex 官方明确「Accepting doesn't send automatically」。〔官方·文档 / 官方·发布说明（摘要）〕
- **拒绝**：继续打字、切走焦点、Esc、下一轮替换。Claude Code 用「打字即消失」作为主要拒绝路径〔官方·文档〕。
- 接受后建议保留 **provenance 标记**（社区 issue #60087 的核心诉求）；否则模型会把建议措辞当用户意图。

### 6.5 防止 ghost 被误当真实输入提交

- 必须有「接受门」：**空输入按 Enter 不得提交 ghost**。Claude Code 2.1.136 的修复原文就是「prompt suggestions being auto-submitted by Enter on an empty input instead of requiring Tab or arrow」〔官方·changelog〕。
- **ghost 不进 undo/redo 栈**；接受时才产生一次 `setDraft`（一次撤销步）。
- 提交前校验：draft 非空、非我 `suggested` 标记、非 IME composing、`phase === 'plain'`。
- 无障碍：ghost 需要 `aria-live` 播报与可见的 Tab 键帽提示（Claude Code 社区 #76591 的直接诉求）；同时提供关闭开关，避免屏幕阅读器噪声（Codex CLI issue #10562 的教训）。

### 6.6 降噪 / 成本 / 开关

- 默认策略二选一：**默认开 + 可关**（Claude Code、Codex 桌面 app 的选择）或**默认关 + 显式按钮**（Trae 的路径）。社区对「默认开、不可关」的负反馈极强〔社区·issue #10562/#13466〕。
- 开关要能被设置文件/环境变量覆盖且语义稳定（Claude Code 2.1.238 修过 env=true 被额度 gating 静默覆盖）〔官方·changelog〕。
- 中文场景要单独验证：Claude Code 曾出现中日韩建议被过滤/整条丢弃（2.1.269）〔官方·changelog〕。

---

## 7. 对本插件（dsh-composer-enhance）的设计含义

### 7.1 现状（来自本仓库代码，不是外部资料）

- 插件是 **✨ 按钮 + 原地改写已有草稿**：按钮注册在 `conversation.input.right`（order 10，模型座位左边）；问答 chips/面板与慢轨 offer 注册在 `conversation.input.dock`（order 5，输入卡片上方）。见 [index.tsx](dsh-composer-enhance/src/client/index.tsx)。
- **空草稿时 ✨ 是禁用的**（`blockedReason` 里 `draft.trim() === ""` 直接返回提示），所以「空输入 ghost」与现有按钮在状态上天然互斥，这是好事。见 [ui.tsx](dsh-composer-enhance/src/client/ui.tsx)。
- 客户端状态机：`idle → gate(fast) → chips/panel → writing → done(改动清单 + 还原) → slow 复核`；每次接受改写调用**恰好一次** `inputActions.setDraft`（一次撤销步）；慢轨自动替换有安全阀：≤30s、草稿仍聚焦、草稿未被编辑（draftRev/字节一致）、改动清单非空，否则只提供「更严格的版本可用」。见 [store.ts](dsh-composer-enhance/src/client/store.ts)、[protocol.ts](dsh-composer-enhance/src/client/protocol.ts)、[protocol.md](dsh-composer-enhance/docs/protocol.md)。
- 已用 `window.addEventListener('keydown', …)` 处理 Esc 取消（ui.tsx），说明「全局键盘拦截」是本插件已有先例，但也是风险点（见 7.6）。
- host 通过 `POST /dsh-composer-enhance/enhance` 做快慢两阶段（host HTTP route），客户端不直接调模型。见 [protocol.md](dsh-composer-enhance/docs/protocol.md)。

### 7.2 若加「空输入灰色建议 + Tab 接受」：建议状态机

在现有 store 上增加一套独立 ghost slice（不要复用慢轨 offer 的状态）：

```
ghostIdle
  └─(轮结束 / 空草稿 / 页面可见 / 非 busy)──► ghostLoading
        ├─成功且草稿仍为空、rev 未变──► ghostShown { text, rev, turnId, source }
        ├─草稿已非空 / 轮次已变 / 超时 / abort──► ghostIdle
        └─失败──► ghostIdle（静默，不打扰）
ghostShown
  ├─Tab / → / 点击键帽──► ghostAccepted（一次 setDraft，清 ghost，写 provenance badge）
  ├─任意输入（draft-changed）──► ghostDismissed + abort
  ├─发送 / 切会话 / 失焦 / TTL──► ghostIdle
  └─下一轮结束──► 用新建议替换
```

### 7.3 需要的 UI 状态与事件

| 需要的东西 | 现状 | 缺口 / 建议 |
|---|---|---|
| 草稿文本、draftRev、phase、focus、busy | 已有（`useInput` + `InputState`：`draft` / `draftRev` / `phase`） | 够用；ghost 生成时记录 `draftRev`/turnId 做 CAS |
| 「一轮回复结束」事件 | 插件目前只用草稿事实驱动 | 需要按轮触发源（或退化为：草稿变空 + idle 后延时触发） |
| IME 组合状态 | DSH 输入 contract 里有 `arbitrate(key, composing)`，但该手柄是 InputBar 私有，插槽拿不到 | Tab/Esc 拦截需自己判 `isComposing`，并在 composition 期间禁用接受 |
| ghost 的视觉承载 | composer card 里有 `conversation.input.overlay` 插槽（list / session scope，渲染在 `.overlayAnchor` 内） | 可用它做绝对定位的 ghost 层；但**不能**指望它拿到编辑器内部光标位置 |
| 键盘接受 | 插件已有 window keydown（Esc） | Tab 需 capture 阶段 + 焦点在 composer card 内 + 无菜单/无 IME + ghostShown，才 `preventDefault` |
| 写入草稿 | `inputActions.setDraft`（整段替换）与 `insertText(text, span)`（在捕获位置插入、一次撤销步） | 空输入接受用 `setDraft` 最简单；若将来支持「光标处补全」用 `insertText` |
| provenance / 提交元数据 | DSH 当前 InputActions/InputState 没有「来源」字段 | 只能 UI 层标记；若要传给模型/落库，需 host/protocol 扩展（风险：当前协议无 message metadata 通道） |
| 关闭开关 | 插件已有 config 块（provider/model/effort…） | 增加 `ghostSuggestions: "off" \| "auto"` 与会话级开关；默认建议 **off 或 auto 但可一键关** |

### 7.4 与现有 ✨ 按钮如何共存

1. **分工按草稿状态**：空草稿 → ghost 建议（Tab 接受）；非空草稿 → ✨ 增强（现状不变，空草稿时 ✨ 仍禁用）。接受 ghost 后草稿变为非空，✨ 自动可用，ghost 立即清除。
2. **共享一个 in-flight 池**：点击 ✨ 或发送消息时，先 abort ghost 请求；ghostLoading/✨ running 互斥，避免两个模型请求同时烧成本。现有快慢两轨已有 `AbortController` 模式可复用。
3. **不要复用 dock 的「更严格的版本可用」行**：dock 已经承载 chips/面板/慢轨 offer；ghost 用 `conversation.input.overlay`（视觉上贴输入框）更贴近 Claude Code 的观感，也不挤占 dock 的问答空间。
4. **一次只显示一个建议**：不要在 dock 里再列多条候选；Claude Code/Codex 都是单条 ghost，多条会让用户不知道 Tab 接受哪条。

### 7.5 DSH 能力边界（决定实现形态）

- composer 输入区是 **Lexical contenteditable**（`DraftEditor`），draft 文本与引用 chips 在 shell 的编辑器里，插件只能通过 `InputActions`（`setDraft` / `insertText` / `captureInsertion` / `submit`）间接写。**没有公开 API 把 ghost 文本画进编辑器文本流**。→ 真正的「内联灰字」只能用 overlay 层**视觉模拟**：在输入区上方叠一层 pointer-events-none 的灰字，空草稿时显示。
  - 位置依据：`conversation.input.overlay` 插槽渲染在 composer card 的 `overlayAnchor` 中（本机 DSH 源码 `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js` 约 18990–19050 行；插槽注册约 19880–19910 行）。
- Tab 是浏览器/编辑器级焦点键，DSH 没有给插件的按键仲裁入口（`arbitrate/space/paste` 属 InputBar 私有，见 `lib/types/client/contract/input.d.ts` 的 `InputActions` 注释）。→ Tab 接受只能靠 window capture 监听 + 严格守卫，属于**跨版本较脆**的方案；替代方案是「点击键帽接受」或自定义组合键（如 Ctrl+Space）。
- 空输入时 Enter 在 DSH 不会发送（发送按钮 disabled，`primaryDisabled = empty || …`）——这条**天然降低** ghost 被误提交的风险，但仍需在 ghost 可见时吞掉 Enter，避免把 Enter 当成「接受+提交」。

### 7.6 风险点清单

| 风险 | 触发条件 | 缓解 |
|---|---|---|
| Tab 抢键 / 与焦点导航冲突 | ghostShown 且插件全局拦截过宽 | 只在焦点在 composer card、`phase==='plain'`、`!isComposing`、无菜单打开时拦截；其余放行 |
| ghost 被误当真实输入 | ghost 写进 draft / 生成时未 CAS | ghost 只存在于插件状态；接受才 `setDraft`；写入前 CAS draftRev + 草稿仍为空 |
| 接受后用户稿件被覆盖 | 生成期间用户已输入/粘贴 | draft-changed 即 dismiss；接受前二次校验；参考 Claude Code 2.0.70 修复 |
| 误提交 | 空输入 Enter / 接受后回车过快 | 吞掉 ghost 可见时的 Enter；接受后不清除键盘焦点、不自动 submit |
| 撤销栈变脏 | 每次渲染都 setDraft | 只在接受时写一次；还原走一次 `setDraft`（与现有 `restore` 一致） |
| 成本失控 | 每次击键都请求 host | 轮后/点击触发 + 防抖 + 单飞 + 频控 + 未用降频（Claude 的 20 条机制） |
| 中文/IME 下建议不出现或被截断 | CJK 分词、composition | 单独跑中文用例；composition 期间不请求、不显示；参考 Claude 2.1.269 修复 |
| 无障碍 | ghost 被屏幕阅读器反复朗读 | aria-live 礼貌播报 + 关闭开关 + 可见 Tab 键帽 |
| 会话切换/草稿重放 | ghost 属于旧会话 | ghost 绑定 sessionId + draftRev + turnId；切换即丢弃 |
| host 路由未鉴权/注入 | 空输入也读会话上下文 | 沿用 protocol.md 的「草稿是数据不是指令」；M2 补鉴权；ghost 请求也要带会话身份 |
| provenance 无法传给模型 | DSH 无 message metadata | 先 UI 标记「来自建议」；若要模型感知需扩展协议（明确列为后续项） |

### 7.7 建议的 MVP 路线（按风险从低到高）

1. **P0**：只做「轮后建议 → dock 一行可点击接受（点键帽或按钮），Tab 作为可选增强」。不碰 contenteditable，不抢 Tab。可直接复用现有 store/AbortController。
2. **P1**：用 `conversation.input.overlay` 画视觉 ghost（空草稿时）＋ Tab capture 严格守卫；接受走 `setDraft` 一次；draft-changed 即 dismiss。
3. **P2**：provenance 标记、频率衰减、CJK/IME 用例、config 开关与托管开关；若需要模型感知来源，再扩 host 协议。

---

## 8. 明确的「未找到可靠来源」清单

- Trae：空输入时点击「优化输入内容」的行为（禁用/报错/生成开场建议）——**未找到可靠来源**。
- Trae：是否有并排对比/差异高亮视图——**未找到可靠来源**（官方只写原地优化 + 可修改）。
- Trae：该功能的快捷键——**未找到可靠来源**（官方快捷键表未列）。
- Trae：是否有启用/关闭开关、生成耗时与失败重试的官方规则——**未找到可靠来源**（社区仅称可重试）。
- Trae：当前最新版是否仍保留该入口——社区论坛有存疑讨论，但官方文档仍记载，**不能确认下线**〔社区·文章〕。
- Codex CLI：是否存在任何生成式 suggestion/ghost 接受能力——截至研究日，只有 placeholder 证据与「已移除轮换 placeholder」的员工回复；**未找到**生成式建议来源。
- Codex 桌面 app predictions 的模型名/生成细节/防抖与缓存策略——官方未公开（媒体转述的产品细节不算官方确认）。
- Claude Code：ghost 的固定过期秒数、防抖参数、后台请求的具体 prompt——官方未公开。
- 三家是否有「ghost 内容不被提交」的完整技术规范——只有 Claude Code changelog 的一条修复记录可作证据，其余未公开。

---

## 9. 来源清单

### 官方来源

1. Claude Code · Prompt suggestions（交互规格、跳过条件、关闭方式）— <https://code.claude.com/docs/en/interactive-mode#prompt-suggestions>
2. Claude Code · 环境变量（`CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION`，灰色预测的定义）— <https://code.claude.com/docs/en/env-vars>
3. Claude Code · Settings reference（`promptSuggestionEnabled`）— <https://code.claude.com/docs/en/settings-reference#promptsuggestionenabled>
4. Claude Code · CLI reference（`--prompt-suggestions`）— <https://code.claude.com/docs/en/cli-reference>
5. Claude Code · Agent SDK TypeScript（`promptSuggestions`、`SDKPromptSuggestionMessage`）— <https://code.claude.com/docs/en/agent-sdk/typescript>
6. Claude Code · CHANGELOG（2.0.70/2.0.71/2.1.136/2.1.238/2.1.269/2.1.283 等条目）— <https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md>
7. Codex · Composer predictions 官方帮助中心 — <https://help.openai.com/en/articles/20001601-composer-predictions-in-codex>（中文：<https://help.openai.com/zh-hans-cn/articles/20001601-composer-predictions-in-codex>）
8. OpenAI · ChatGPT release notes（2026-10-09 Composer predictions 条目，经检索摘要）— <https://help.openai.com/en/articles/6825453-chatgpt-release-notes>
9. Codex · 员工回复「移除轮换 placeholder」— <https://github.com/openai/codex/issues/13466#issuecomment-5211502344>
10. Trae · 对话文档（「优化输入内容」图标位置）— <https://docs.trae.cn/ide_chat.md>
11. Trae · 官方更新文章「新增 Prompt 一键优化能力…」（2025-08-19）— <https://developer.volcengine.com/articles/7540133366889513010>
12. Trae · 快捷键文档（无该动作快捷键）— <https://docs.trae.cn/ide_keyboard-shortcuts?lang=zh>

### 社区 / 媒体来源

13. Claude Code · 桌面版 ghost 建议消失（2026-10）— <https://github.com/anthropics/claude-code/issues/98971>、<https://github.com/anthropics/claude-code/issues/103335>
14. Claude Code · ghost 缺少 Tab 提示 — <https://github.com/anthropics/claude-code/issues/76591>
15. Claude Code · 建议接受后的 provenance 缺口 — <https://github.com/anthropics/claude-code/issues/60087>
16. Claude Code · 限流时建议被静默抑制 — <https://github.com/anthropics/claude-code/issues/72495>
17. Claude Code · 关闭开关失效旧 bug — <https://github.com/anthropics/claude-code/issues/14629>
18. Codex CLI · 灰字是 placeholder / 无法关闭 — <https://github.com/openai/codex/issues/10562>（含源码分析评论 #issuecomment-5176933787）
19. Codex · 相关功能请求被关闭 — <https://github.com/openai/codex/issues/13714>
20. Codex 桌面 app · Composer predictions 媒体实测 — <https://mixed-news.com/en/codex-composer-predictions-beta-on-by-default-tab-to-accept/>
21. Codex 桌面 app · 媒体分析 — <https://alphasignal.ai/news/openai-s-codex-now-predicts-your-next-coding-command-before-you-type>
22. Trae · SOLO 技巧（可修改/重试）— <https://juejin.cn/post/7573002274324545582>
23. Trae · 论坛「旧版一键优化按钮」讨论（2026-10-18）— <https://forum.trae.cn/t/topic/325883/3>
