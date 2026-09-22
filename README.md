# dsh-composer-enhance

DeepSeek Harness Web 的**输入框提示词增强**插件。原生插件形态：TypeScript 源码 + 构建产物
`lib/index.js`(host) / `lib/client.js`(client)，通过 `dsh.client` 与 `cordis.patch.yml` 声明，
用 `plugin_manager` 安装、启用与停用。

> 状态：**M1 骨架**。当前 ✨ 按钮会把草稿发到 host 路由并原样写回，末尾附一个时间戳标记，
> 用来证明「按钮 → 路由 → 写回草稿」整条链路通。真正的增强管线在 M2 接入。

## 安装

```bash
# 在 DSH 里（Creator 模式）用 plugin_manager 安装本地路径或 git 地址
plugin_manager install_bundle <本目录绝对路径 或 git 地址>
```

安装后该 bundle 会出现在 profile 的 `dsh.profile.bundles` 里，可在侧边栏 Plugins 页或
`plugin_manager set_bundle` 里停用/启用。

## 开发

```bash
pnpm install
pnpm run build      # 产出 lib/index.js 与 lib/client.js
pnpm run typecheck  # tsc --noEmit
```

`lib/` 是**提交进仓库**的产物：`plugin_manager` 从 git 或目录安装时不会运行构建，所以产物必须已经存在。

### 工作区在 fuse.portal 上时

本会话的工作区是 `/run/user/1000/doc/<id>/dsh`（fuse.portal 挂载）。该路径下
`getcwd(2)` 的路径回溯会失败，Node 的 `process.cwd()` 直接抛 `ENOENT`，因此 `pnpm` 与
`esbuild` 不能以工作区为工作目录运行。`scripts/dev-build.sh` 处理这件事：把源码镜像到
`$DSHCE_BUILD`（默认 `~/work/dshce-build`）构建，再把产物拷回工作区。

```bash
./scripts/dev-build.sh
```

普通磁盘路径上直接用 `pnpm run build` 即可，不需要这个脚本。

## 结构

| 路径 | 作用 |
|---|---|
| `src/index.ts` | host 半部：在 `webServer` 上挂一条 exact 路由，disposer 交给 `ctx.effect` |
| `src/client/index.tsx` | client 半部：`conversation.input.right` 里的 ✨ 按钮 |
| `scripts/build.mjs` | esbuild 构建 + 给 client 套 `window.__ModuleLoader__.load` envelope |
| `cordis.patch.yml` | bundle 层：插入 `composer-enhance` 这一行 |

## 设计取舍

- **不引入 DSH 之外的运行时依赖**，host 半部 M1 不 import 任何东西。
- **控件一律取自 `@deepseek-ai/dsh-client-ui-primitives`**，包括 ✨ 图标本身
  （`IconSparkle16`）。上一版手绘 sparkle SVG 是因为误以为官方没有该字形。
- **`lib/` 提交进仓库**，保证从 git 安装可用。
- **`dsh.client.inject` 只声明真正 require 的非基线模块**（目前是 ui-primitives）。

## 许可证

MIT
