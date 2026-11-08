# 发布与上架指南

> 目标：把这个仓库变成一个别人能用 `dsh plugin add` 装上的插件，并进入
> [awesome-dsh-plugin](https://awesome-dsh-plugin.com) 目录（`dshmarket` 市场读的就是它）。

---

## 0. 占位符（已完成）

已替换为 GitHub 用户 **`yyyjjjqqq714-spec`**，覆盖：

- `package.json` 的 `repository` / `homepage` / `bugs`
- `README.md` 与 `README.zh.md` 的安装示例

后续如果换账号，重新执行：

```powershell
cd "F:\软件\DeepSeek Harness工作区\ai-workflow-kit"
(Get-Content package.json -Raw) -replace 'yyyjjjqqq714-spec', '新用户名' | Set-Content package.json -Encoding utf8
```

---

## 1. 打包

```powershell
npm pack
```

产物：`dsh-ai-workflow-kit-0.2.0.tgz`，约 **8.2 MB**，714 个文件。

体积构成：

| 部分 | 体积 |
|---|---|
| 340 张缩略图（640×360） | ~8.3 MB |
| 340 篇风格原文 | ~1.4 MB |
| 8 个提示词 + 5 个代码模板 | ~30 KB |
| 宿主/浏览器代码 | ~40 KB |

打包白名单在 `package.json` 的 `files` 里。`content/exports/`、`content/styles/_generated/`、
`tools/`、`docs/` 都刻意排除 —— 它们只服务开发期和静态站。

> 注意：npm 的 `files` 白名单优先级高于 `.npmignore`，所以子路径必须精确列举，
> 不能只写 `content`（否则会把 15 MB 的 exports 一起打进去）。

---

## 2. 建 GitHub 仓库并发布 Release

```powershell
git add -A
git commit -m "feat(0.2.0): 可分发重构，内容随包，补齐 B1/B2/B3"
git remote add origin https://github.com/你的用户名/dsh-ai-workflow-kit.git
git branch -M main
git push -u origin main
```

然后在 GitHub 建 Release，tag `v0.2.0`，上传 `dsh-ai-workflow-kit-0.2.0.tgz`。

**关键**：Release 资产名改成不带版本号的固定名，这样 `latest/download` 永久可用：

```
dsh-ai-workflow-kit.tgz
```

安装命令就变成：

```sh
dsh plugin --profile web add "https://github.com/你的用户名/dsh-ai-workflow-kit/releases/latest/download/dsh-ai-workflow-kit.tgz"
```

---

## 3. 提交到 awesome-dsh-plugin

市场只认这个目录。**不要**往 `dsh-market/dsh-market`（市场应用本身）提 PR。

1. fork [`awesome-dsh-plugin/awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
2. 在 README 的 **Workflow & Automation**（分类 `workflow`）段落加一行
3. 提 PR，标题形如 `Add dsh-ai-workflow-kit`

条目建议内容：

```markdown
- [dsh-ai-workflow-kit](https://github.com/你的用户名/dsh-ai-workflow-kit) - 340 条代码动画风格库 + 8 个提示词 + 5 个可渲染代码模板，侧栏面板浏览、`/awkit` 命令检索，并作为 Agent 工具（awkit_search / awkit_get_style / awkit_render_template）供模型直接调用。Content ships inside the package: a 340-entry code-animation style library, 8 prompt templates and 5 renderable code templates in a sidebar panel, plus agent tools to search and render them.
```

CI 会自动补 `npm` / `version` / `stars` / `downloads` / `install` / `capabilities`，
作者只需写名称、链接和一段双语描述。通常一天内合并，站点和市场随即生效。

### 会被自动检测的能力标签

| 标签 | 为什么会有 |
|---|---|
| `fs-read` | 读 `content/` 里的风格原文与缩略图 |
| `fs-write` | `awkit_render_template` 传 `write:true` 时写盘 |

没有 `network`、没有 `shell`、没有 `credentials`，所以不会触发红线组合
（"读凭证 + 联网"）。

---

## 4. 装到别的机器上验证

在**另一台**机器（或临时 profile）上：

```powershell
dsh plugin --profile web add "https://github.com/你的用户名/dsh-ai-workflow-kit/releases/latest/download/dsh-ai-workflow-kit.tgz"
```

重启 DSH，检查清单：

- [ ] 侧栏出现「AI 工作流」入口
- [ ] 打开后有 340 条风格，缩略图不全裂
- [ ] 点开任一风格能看到完整提示词正文（不是"正文为空"）
- [ ] 代码模板页填变量能实时渲染
- [ ] `/awkit 水墨` 有结果
- [ ] 对话框里问「有哪些视频风格」时，模型能调到 `awkit_search`

任一条失败，先看 `dsh plugin --profile web list` 里包是否装成，再看 DSH 日志。

---

## 5. 后续发版

```powershell
# 改 package.json 的 version，然后
npm pack
# 上传新 tar 到新 Release，资产名仍叫 dsh-ai-workflow-kit.tgz
```

`latest/download` 会自动指向新版本，用户端 `dsh plugin update` 即可。
市场里的版本号由 CI 从 GitHub Release 读取，**不需要**再提 PR。

---

## 6. 如果以后想上 npm

本机当前 `npm whoami` 报 `ENEEDAUTH`。等你有 npm 账号后：

```powershell
npm login
npm publish --access public
```

包名 `dsh-ai-workflow-kit` 在 npm 上当前**可用**（已查，404）。
发布后市场会自动把 `install` 换成 `dsh plugin add dsh-ai-workflow-kit`。

---

## 现状（2026-11-08）

| 项 | 值 |
|---|---|
| 仓库 | https://github.com/yyyjjjqqq714-spec/dsh-ai-workflow-kit （main = `d616477`） |
| Release | v0.2.2 · https://github.com/yyyjjjqqq714-spec/dsh-ai-workflow-kit/releases/tag/v0.2.2 |
| 资产 | `dsh-ai-workflow-kit.tgz`（9.47 MB；故意去掉版本号，让 `releases/latest/download/` 永久有效） |
| 上架 PR | #13068 · https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/13068 |
| PR 改动 | `README.md` +1、`README.zh.md` +1，无其他文件 |

安装：

```sh
dsh plugin --profile web add "https://github.com/yyyjjjqqq714-spec/dsh-ai-workflow-kit/releases/latest/download/dsh-ai-workflow-kit.tgz"
```

### 端到端验证记录

在临时 profile `awkit-e2e` 里用上面这条命令装过一次，结果：

- 714 个文件 / 10.05 MB，`package.json`、`lib/*`、`content/*`、`LICENSE` 全部到位
- 340 篇风格原文 + 340 张缩略图 + 8 个提示词 + 5 个模板（10 个文件）
- `createContentService()` 在安装目录下自定位成功：340 条风格、8 条提示词、5 个模板
- 搜索：「水墨」4 条、「A3」20 条、「CRT」3 条、「雨」10 条
- 验证后已删除该临时 profile

### 踩过的坑

1. **fork 基线太旧会让 PR 变成几百个无关文件的改动。** 正确顺序是：先把 fork 的
   `main` 强制同步到 upstream 最新 head，再用 git data API 以该 head 为 parent 提交。
2. **pnpm 不读系统代理。** 系统代理开着、浏览器能开 GitHub，`dsh plugin add` 仍可能
   `ETIMEDOUT`；要显式设 `$env:HTTPS_PROXY`。
3. **缩略图裁切的 `DrawImage(dest, srcX, srcY, srcW, srcH, unit)` 后四个参数是源图像素**，传缩放后的尺寸会让每张图只取左上角一块（0.2.2 修的就是这个）。`contentVersion` 必须把图片文件大小算进指纹，否则客户端一直用旧图缓存。
4. **PowerShell 的 `ConvertTo-Json` 会把 `>=0.1.7` 写成 `\u003e=0.1.7`**，改 `package.json`
   请直接编辑或用 node，不要用 PS 的 JSON 往返。
