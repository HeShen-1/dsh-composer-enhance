# dsh-composer-enhance

DeepSeek Harness Web 的**输入框提示词增强**插件：输入框旁的 ✨ 按钮读会话上下文，
判断草稿缺不缺"会实质改变产出"的信息，缺就问、不缺就改写，并把改动列出来、可一键还原。

**技术栈**：Node.js ≥ 22，原生 ESM；TypeScript 源码构建到 `lib/`；宿主半 `lib/index.js`
（Cordis 插件，注册宿主 HTTP 路由），客户端半 `lib/client.js`（`dsh.client.platform = "web"`）。
无打包器，`scripts/build.mjs` 直接产出。

测试命令: node test/grounding-smoke.mjs && node test/handler-smoke.mjs && node test/host-smoke.mjs && node test/parser-smoke.mjs

**目录约定**
- `src/`：TypeScript 源码
- `lib/`：构建产物（客户端半与宿主半都靠它跑）
- `test/`：离线冒烟测试 —— 都不需要 DSH 运行时、不需要网络，`cd /tmp && node <本仓库>/test/<file>.mjs` 也能跑
- `scripts/`：构建脚本
- `.dev/`：devflow 流程状态（PROJECT.md 进 git；state/tickets/log 不进）

开发约定：
- 改完跑上面的测试命令；devflow 的实测证据由 `gate.mjs --run-tests` 生成，手写的不算
- 阶段推进只跑 `node <devflow>/bin/gate.mjs --repo . --to <phase>`，phase 由闸门写回
- 改了 `src/` 要重新构建到 `lib/` 再跑测试（测试导入的是 `lib/`）
