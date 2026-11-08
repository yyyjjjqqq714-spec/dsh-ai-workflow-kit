# AI 工作流 · DeepSeek Harness 插件

[English](README.md)

侧栏面板，把 **340 条代码动画风格库**、**提示词模板** 和 **可渲染的代码模板**
放在对话旁边；同一套内容也作为 Agent 工具暴露给模型，它能自己搜风格、取实现提示词。

内容全部随包分发：不用额外下载、不联网、不写死任何本机路径。

---

## 为什么做它

提示词库通常躺在一个你记不住路径的文件夹里。这个插件把它变成可浏览、可搜索、
可在对话里直接调用的资源。

- **340 条视频风格**，分 10 个系列（代码样片、卡通、动态图形、中国风、
  奥斯卡影片配色、code-video 等），每条都带原始实现提示词。
- **8 个提示词模板**：分镜、标题卡、风格混搭、风格转代码、教程、口播稿。
- **5 个代码模板**：Fastify 路由、React 组件、Zod schema、FastAPI 路由、argparse CLI，
  带变量声明与一键渲染。
- **分镜生成器**：选风格、填主题，直接产出一份含平台规则的总导演指令。

## 安装

从插件市场安装，或：

```sh
dsh plugin --profile web add dsh-ai-workflow-kit
```

用 Release 包钉版本：

```sh
dsh plugin --profile web add "https://github.com/yyyjjjqqq714-spec/dsh-ai-workflow-kit/releases/latest/download/dsh-ai-workflow-kit.tgz"
```

需要 DeepSeek Harness `>= 0.1.7`。替换已装版本后需重启 DSH；首次安装可经 HMR 激活。

**走代理** —— DSH 的插件管理器实际调用 pnpm，而 pnpm 不读系统代理设置。如果浏览器能打开 GitHub、安装却卡在 `ETIMEDOUT`，把代理显式传给它：

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7897"   # 换成你自己的代理
dsh plugin --profile web add "https://github.com/yyyjjjqqq714-spec/dsh-ai-workflow-kit/releases/latest/download/dsh-ai-workflow-kit.tgz"
```

## 用法

**侧栏** —— 点 **AI 工作流** 打开面板。三个标签页、一个搜索框（按 `/` 聚焦）。

- **视频风格** —— 按系列分组的缩略图墙。点开任意卡片可得完整提示词、复制按钮，
  以及 **生成分镜指令**（把风格 + 主题 + 平台 + 时长合成一段可直接下达的导演指令）。
- **提示词** —— 8 个模板，复制或直接发进对话。
- **代码模板** —— 填变量表单，源码实时更新，可复制或发进对话。

**斜杠命令**

```
/awkit                总览与帮助
/awkit 水墨           关键词搜索，并给出首条提示词
/awkit S1-A3          按编号精确取
/awkit prompts        提示词清单
/awkit templates      代码模板清单
```

**Agent 工具** —— 模型可在普通对话轮里调用：

| 工具 | 作用 |
|---|---|
| `awkit_search` | 检索风格 / 提示词 / 模板 |
| `awkit_get_style` | 按 id 取完整风格提示词 |
| `awkit_render_template` | 按变量渲染代码模板（默认只返回文本） |
| `awkit_overview` | 整个资源库的清单 |

典型问法：**「用 S1-A3 这个风格，帮我做一条 45 秒抖音讲别熬夜的分镜」** ——
模型会自己找到风格、取出提示词、产出分镜。

## 隐私与权限

- 内容从插件包内 `content/` 读取，只用 `node:fs` 只读调用。
- 唯一的 HTTP 面是同源前缀路由 `/awkit/api`，服务你自己浏览器里的面板。
- 无遥测、无外发网络请求、不调用 shell。
- 写盘是显式且单一用途的：只有调用方同时传 `write: true` 与 `targetDir` 时才写，
  且拒绝任何越出目标目录的路径。

## 结构

```
index.js            宿主入口 —— 只做装配
lib/content.js      内容层：加载、缓存、检索、错误码
lib/routes.js       同源 REST API（新旧路由都兼容）
lib/tools.js        Agent 工具
lib/commands.js     斜杠命令
client.js           浏览器半：面板、详情、分镜生成器、模板渲染器
content/            340 条风格 + 缩略图、8 个提示词、5 个代码模板
tools/              构建与冒烟脚本（不进发布包）
```

本地开发：

```sh
node tools/prepare-content.mjs      # 把风格原文拷进包
node tools/build-content-manifest.mjs
node tools/smoke.mjs                # 宿主半
node tools/check-client.mjs         # 浏览器半
```

## 许可

MIT。第三方风格提示词保留其原始条款，出处见 `content/styles/`。
