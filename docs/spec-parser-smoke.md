# 规格：解析层离线冒烟测试 + 一条命令跑全部离线测试

（devflow 流程产物：spec 阶段。对应 GitHub issue 见文末。）

## 问题

`lib/index.js` 里有三个**纯解析函数**，它们决定了"模型回什么算数"：

- `parseJsonLoose(raw)`：模型输出里夹着 markdown 代码围栏、前后废话、单引号时，能不能把 JSON 抠出来；
- `normalizeGate(parsed)`：`hasAmbiguity / shape / chips / questions` 缺字段、类型写错时，兜底行为是什么；
- `parseRewrite(raw)`：`MARK_DRAFT / MARK_ISSUES / MARK_ASSUMPTIONS` 三段缺失时的降级路径。

现有三个离线冒烟测试覆盖的是 **grounding（会话上下文）**、**handler（请求级状态机、模型调用次数）**、
**host（路由与配置）**，**没有一个直接盯解析层**。解析层正好是最容易被模型输出形状变化打破的地方
（少一个字段、多一层围栏、`chips` 从数组变对象），而且坏了之后症状是"界面上什么都不发生"，
很难从日志反推。

另外这个仓库有 4 个离线测试文件，却没有 `npm test`：新人和 CI 只能靠 README 里一句话自己拼命令。

## 目标

1. 新增 `test/parser-smoke.mjs`：直接打解析层的边界 —— 围栏 JSON、前后混文本、单引号、
   缺字段、类型不对、`shape` 非法值、`chips` 空数组、`questions` 与 `chips` 互斥时的取舍。
2. `package.json` 加 `test` 脚本：一条命令按顺序跑全部离线测试（4 个文件）。
3. README 加"测试"段：离线测试怎么跑、为什么它们不需要 DSH 运行时。

## 非目标

- 不改 `lib/index.js` 的行为（纯测试 + 脚本 + 文档）。
- 不引入测试框架（沿用 `node --test`? 不 —— 现有冒烟测试是手写 `ok()` 计数，新文件沿用同一风格，
  保持"零依赖、可直接 `node test/x.mjs` 跑"的性质）。
- 不碰构建链（`scripts/build.mjs` 不动）。

## 验收

1. `node test/parser-smoke.mjs` 单跑通过，输出 `<文件名>: N passed, 0 failed`，N ≥ 12。
2. 四个离线测试文件按 `npm test` 顺序全绿（16 + 36 + 59 + 36 = 147 项）。
3. 反例有效：破坏 `parseJsonLoose` 里"字符串内的括号不参与配对"这条保护（把 `inString` 分支短路），
   `parser-smoke` 必须红。
   > 初版验收写的是"注释掉围栏处理必须红" —— **实测证伪**：`parseJsonLoose` 是从第一个 `{` 开始按
   > 括号深度截取的，围栏在截取范围之外，单个对象场景下 `replace(/```/g,"")` 不影响结果。
   > 真正的保护是括号配对 + 字符串感知，所以反例换成后者（见 issue 评论）。
4. README 有"测试"段，写明四个文件、项数与"不需要 DSH 运行时/网络"。

## 边界

- 测试只依赖 `lib/index.js` 的公开导出（`parseJsonLoose` / `normalizeGate` / `parseRewrite` / `PROMPTS`），
  不 mock 内部状态；`DSHCE_LIB` 环境变量沿用现有约定。
- 解析层现在的兜底行为就是"契约"：测试锁的是**现在的**行为，不是理想行为；发现不合理的地方写进结论，不在本票里改。
