# AI 工作流工具集 · 接入说明

这个包把 340 个视频风格、8 个提示词、5 个代码模板打包成可被任何程序读取的格式。

## 一、数据长什么样

```
exports/
├── index.json          总入口：版本、统计、各资源路径
├── styles.json         340 条风格元数据
├── styles/
│   ├── S1-A3.md        每个风格的完整提示词（Markdown）
│   └── S1-A3.jpg       示意图（320x180）
├── prompts.json        8 个提示词索引
├── prompts/<slug>/v1.md
├── templates.json      5 个模板索引
└── templates/<lang>/<framework>/<kind>/
    ├── template.json
    └── files/...
```

### `styles.json` 单条结构

```json
{
  "id": "S1-A3",
  "name": "大字冲击",
  "series": "S1",
  "seriesDir": "A-G_代码样片",
  "hasStill": true,
  "generated": false,
  "source": "A-G_代码样片/A3_大字冲击.md"
}
```

- `hasStill: true` = 有原作者的真实参考图
- `generated: true` = 无原图，是我按提示词渲染的示意图
- 两者必有一个为 true

### `prompts.json` 单条

```json
{ "slug": "mv-storyboard", "version": "v1", "title": "MV 分镜生成", "chars": 686 }
```

### `templates.json` 单条

```json
{
  "id": "ts-fastify-route",
  "title": "Fastify REST 路由",
  "lang": "typescript",
  "framework": "fastify",
  "kind": "route",
  "vars": [{ "key": "Resource", "type": "PascalCase", "example": "Order" }],
  "files": [{ "from": "files/{{resource}}.ts", "to": "src/routes/{{resource}}.ts" }],
  "path": "typescript/fastify/route"
}
```

## 二、三种使用方式

### 方式 1：直接读文件（最简单）

任何语言都能读 JSON：

```python
import json
styles = json.load(open('exports/styles.json', encoding='utf-8'))
hit = next(s for s in styles if s['id'] == 'S1-A3')
md = open(f"exports/styles/{hit['id']}.md", encoding='utf-8').read()
print(md)          # 完整提示词，可直接喂给模型
print(f"exports/styles/{hit['id']}.jpg")   # 示意图路径
```

```javascript
import fs from 'node:fs'
const styles = JSON.parse(fs.readFileSync('exports/styles.json', 'utf8'))
const md = fs.readFileSync(`exports/styles/${id}.md`, 'utf8')
```

### 方式 2：HTTP API（本地 DSH 运行时）

插件在 DSH 里跑时，会注册以下接口（默认 `http://127.0.0.1:<端口>`）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/awkit/api/overview` | 全量：340 风格 + 提示词 + 模板索引 |
| GET | `/awkit/api/style?id=S1-A3` | 单个风格详情（含 markdown 原文） |
| GET | `/awkit/api/still?id=S1-A3` | 示意图（JPEG，原图优先，无则返回渲染图） |
| GET | `/awkit/api/prompt?slug=mv-storyboard&v=v1` | 提示词原文 |
| GET | `/awkit/api/template?path=typescript/fastify/route` | 模板详情 |

示例：

```bash
curl "http://127.0.0.1:61774/awkit/api/style?id=S1-A3"
```

响应：

```json
{
  "ok": true,
  "id": "S1-A3",
  "name": "大字冲击",
  "series": "S1",
  "seriesDir": "A-G_代码样片",
  "hasStill": true,
  "file": "A-G_代码样片/A3_大字冲击.md",
  "markdown": "# A3 大字冲击\n\n- 分类：..."
}
```

> 端口每次重启 DSH 会变，用 `Get-NetTCPConnection -LocalPort ...` 或看 DSH 窗口标题栏旁边的 URL 确认。

### 方式 3：作为 DSH 插件安装

别人想在自己的 DSH 里用这个面板：

```bash
dsh plugin --profile desktop add "F:\软件\DeepSeek Harness工作区\ai-workflow-kit\plugin"
```

装好后侧边栏出现「AI 工作流」，支持浏览、搜索、看详情、复制提示词。

## 三、在对话里调用

插件注册了一个斜杠命令 `/awkit`：

```
/awkit              → 概览：340 风格 / 8 提示词 / 5 模板
/awkit 水墨          → 搜出匹配项并给出第一条的完整提示词
/awkit A3            → 按编号精确查
```

## 四、典型用法

### 用某个风格做视频

1. 面板里搜「水墨」→ 点开 → 复制提示词
2. 把提示词 + 你的内容（文案/歌词/主题）一起给模型
3. 模型产出 Canvas/HTML → 用 `music_mv_render` 渲染成 MP4

### 用提示词做分镜

1. 提示词 Tab → 点「MV 分镜生成」
2. 复制 → 附上歌词和时长
3. 得到分镜表，风格节点列直接填风格编号

### 用模板生成代码

1. 模板 Tab → 点「Fastify REST 路由」
2. 复制 `template.json`，把 `{{Resource}}` 替换成你的实体名
3. 或直接把模板目录给模型，让它按 `files` 映射生成

## 五、许可证

- 视频风格提示词：来自公开风格库（`F:\skill提示词库\...`），仅供学习与个人创作
- 示意图：193 张为原作者参考图，147 张为按提示词渲染的示意图
- 提示词 / 模板：本项目原创，可自由使用
