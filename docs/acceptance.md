# 验收记录

四类验收标准逐项对应证据。凡是**没有真机观察到的**都标为未通过，不写"应该能跑"。

复跑方式：

```bash
cd /tmp   # 工作区在 fuse.portal 上时，Node 的 cwd 解析会失败
node <repo>/test/host-smoke.mjs        # 34 项
node <repo>/test/grounding-smoke.mjs   # 15 项
node <repo>/test/handler-smoke.mjs     # 24 项
```

---

## A 架构同构

| 标准 | 证据 | 结果 |
|---|---|---|
| TypeScript 源码 + 真实构建步骤 | `src/index.ts` + `src/client/*.tsx` → `scripts/build.mjs`（esbuild）→ `lib/index.js` + `lib/client.js` | ✅ |
| client 产物是官方 envelope | `lib/client.js` 首行即 `window.__ModuleLoader__.load({ id: "dsh-composer-enhance", factory: (require) => {` —— 与 `@deepseek-ai/dsh-client-ui-message-feedback/lib/client.js` 同形 | ✅ |
| `dsh.client` 声明 | `package.json` 的 `dsh.client = { platform: "web", inject: ["@deepseek-ai/dsh-client-ui-primitives"] }`，只声明真正 require 的非基线模块 | ✅ |
| 进入模块图并被服务 | boot graph 里出现 combo URL `/plugins/??…,dsh-composer-enhance/client.js&rev=…`，HTTP 200 / 144 KB | ✅ |
| host 半部不依赖 DSH 内部包的 symlink | `src/index.ts` 只 import Node builtin（`node:fs/promises`、`node:path`），所有 DSH 能力经 `ctx.get()` 取得 | ✅ |
| 类型检查通过 | `tsc --noEmit` exit 0、无输出。host 侧原有 5 个错误（缺 `@types/node`）与客户端 3 个错误（`index.tsx:85` TS2786、`store.ts:360` TS2367、`ui.tsx:152` TS2322）均已修 | ✅ |

## B 观感同构

| 标准 | 证据 | 结果 |
|---|---|---|
| 控件取自 ui-primitives | `Button` / `Pill` / `Checkbox` / `Input` / `Tag` / `Tooltip`；样式只用 `--dsw-*` / `--dsh-composer-*` 令牌，无硬编码颜色、无别家 CSS-module 哈希类名 | ✅ |
| 图标用官方字形 | ✨ = `IconSparkle16`（官方**确有**该字形；上一版手绘 SVG 是基于"官方没有"的错误前提）；spinner = `IconLoadingOutline16`；关闭 = `IconCloseOutline16`；警告 = `IconWarningOutline16` | ✅ |
| 按钮落位 | `conversation.input.right` order 10。真机量测：按钮 `x 969–1005`，模型座位 `x 1017–1200`，**同一行 y 506–534，间距 12px**，DOM 顺序 `enhance-BEFORE-model` | ✅ |
| 面板落位 | `conversation.input.dock` order 5，坐在自带 `todo`(0) 与 `goal`(10) 之间。真机量测：面板 `x 312–1238`，草稿顶边在其下方 | ✅ |
| 三形态与草稿间距 | 结果条 / chips 行 / 面板距草稿顶边**恒为 16px**，不遮挡 | ✅ |
| 键盘可达 | Esc 关闭 chips 与面板；spinner 尊重 `prefers-reduced-motion` | ✅ |
| 无 SVG 手搓 | `grep -c "createElement(\"svg\"" src/client/` = 0 | ✅ |

## C 生命周期原生

| 标准 | 证据 | 结果 |
|---|---|---|
| 用 plugin_manager 安装 | `plugin_manager install_bundle`，返回 `enabled: true`、`application: "applied"` | ✅ |
| 不手改 profile | 安装由 plugin_manager 写入 `dsh.profile.bundles` 与依赖；本项目不含 `install.sh`，也不建 `node_modules/@deepseek-ai/` symlink | ✅ |
| 可停用/启用 | `set_bundle enabled:false` 后再 `true`，两次都 `application: "applied"`；停用后 `conversation.input.right` 占用者消失 | ✅ |
| 旧插件已停用 | `dsh-prompt-enhance` 为 `enabled: false`（保留不删，可回滚） | ✅ |

## D 可分发

| 标准 | 证据 | 结果 |
|---|---|---|
| 公开仓库 | https://github.com/HeShen-1/dsh-composer-enhance | ✅ |
| 从 git 地址安装 | 先 `remove_bundle`，再 `install_bundle https://github.com/HeShen-1/dsh-composer-enhance` → `+ dsh-composer-enhance github:HeShen-1/dsh-composer-enhance`，5.6s，`applied` | ✅ |
| git 安装的副本真的工作 | 装完后路由返回 `engine: 0.2.0-m2`；两个插槽占用者均 `active: true` | ✅ |
| 产物已提交，安装不需构建 | `package.json.files` 含 `lib/`；git 安装后 `node_modules/dsh-composer-enhance/lib/client.js` 首行即 loader envelope | ✅ |
| 构建可复现 | 从 GitHub 全新 `git clone` → `pnpm install` → `pnpm run build`，产物与仓库里提交的 `lib/index.js`、`lib/client.js` **逐字节相同**；73 项测试在克隆产物上全过 | ✅ |

## 质量管线

| 标准 | 证据 | 结果 |
|---|---|---|
| 分级澄清三形态 | 真机：`写个 API` → `shape:"chips"`（4 个具体选项，非夹具）；另一组 → `shape:"panel"`（3 题、每题带描述的选项、`取消/跳过/增强` 三出口）；明确草稿 → `shape:"none"` | ✅ |
| 接地 | `contextUsed` 真机返回 `["systemPrompt","recentTurns"]`；`projectMemory` 离线测试覆盖（离线 15 项含 AGENTS.md/CLAUDE.md 回退与不可读降级） | ✅ |
| 快轨延迟 | `reasoningEffort: "off"`，实测 **1.9–2.3s**（旧版跟随会话模型 `max`，数秒起） | ✅ |
| 改写质量下限 | 同一草稿调 prompt 前后对比：调前 issues 是同义反复（`明确"用 X 安装"指改为 X 安装方式`），调后是具体改动（`「README」明确为 README.md，「安装章节」指该文件里的「安装」小节`） | ✅ |
| 改动清单 + 一键还原 | 真机：结果条列出 kind 标签的 issues 与「假设：…」，「还原原文」把草稿写回 | ✅ |
| chips 不再卡死 | 真机：`questions: []` + `answers:{"chips":["日语"]}` → 响应 `gate` 字段缺席、直接出改写，1.9s；浏览器点 chip 后 console 无任何 composer-enhance 警告（即客户端重试兜底未触发） | ✅ |
| 草稿改动即作废 | 快轨阶段草稿被改 → 流程作废（客户端已有行为，真机验过） | ✅ |
| **慢轨复核（双轨）** | 真机：点 ✨ 后 `data-slow="running"`（t=3s、6s），**同刻草稿已是快轨结果**（51 字）→ 快轨未被阻塞；t=9s 起 `data-slow="none"`，草稿全程未被改、无 offer、无残留 `running`。五条安全阀与取消路径由客户端脚本化慢轨逐条验过（自动替换 / 编辑即作废 / 失败静默 / 超窗口 offer），截图见 `docs/evidence/client-slow-*.png` | ✅ |
| **慢轨的实际产出（负面数据，但它决定要不要留这个功能）** | 真机 4 次慢轨复核，`issues` 计数为 **0 / 0 / 2 / 0**——多数时候"没话说"。也就是说这条每次 ✨ 都多花一次 `effort:max` 的模型调用，换来的是偶发的小幅收紧。窗口已从 8s 放宽到 30s（`effort:max` 实测延迟 1.2s–9.5s，8s 会把自动替换整条分支关掉） | ⚠️ 待决策 |

## 未做 / 已知限制

| 项 | 原因 |
|---|---|
| 不检索 memory 知识图 | MCP 工具注册在 `ctx.tools` 上，插件代跑需经 tool-runtime 调度器（execution token、run context、权限），且会绕过审批语义。独立增量，未做 |
| 草稿图片不带模型 | 旧实现靠爬 `[class*=rail]` 的 blob 图片，是对私有 DOM 结构的依赖；本版未带过来 |
| 插件路由不受页面鉴权保护 | `webServer.register` 无鉴权选项；`GET /` 要 token 但插件 exact 路由是裸的。同机进程可调用并消耗模型额度 |
| 草稿含 `@` 引用时按钮禁用 | `setDraft` 会剥掉引用气泡占位符，增强会静默吃掉 `@文件` |
| 构建不做类型检查 | `scripts/build.mjs` 用 esbuild，**不检查类型**；类型错误不会挡住构建，只会留在仓库里。所以 `pnpm run typecheck` 必须单独跑并保持绿——这一点是查验收文档时才发现的，当时有 8 个错误（host 5 / client 3） |
