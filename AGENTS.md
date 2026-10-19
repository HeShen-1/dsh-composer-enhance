# AGENTS.md

dsh-composer-enhance —— DeepSeek Harness Web 的输入框提示词增强插件。

- 测试：`pnpm test`（四个离线冒烟测试，共 147 项；不需要 DSH 运行时、不需要网络）
- 构建：`pnpm run build`（`src/` → `lib/`，测试导入的是 `lib/`，改完源码先构建再测）
- 类型：`pnpm run typecheck`
- 流程状态：`.dev/PROJECT.md`（devflow 的 context 产物，写清测试命令与目录约定）

改动请保持"零依赖、可直接 `node test/<file>.mjs` 跑"的测试风格。

- 提交前跑一遍 `pnpm test`；devflow 的实测证据由 `gate.mjs --run-tests` 生成。
- 小改（单文件）也走一遍流程：`gate --to spec` 会自动降级并放行。
