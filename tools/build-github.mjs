// 构建可上传 GitHub 的干净发布目录：dist/github/
// 只含：站点 + 源数据 + 工具 + 文档 + workflow
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit'
const OUT = path.join(ROOT, 'dist/github')
const SITE = path.join(ROOT, 'dist/site')

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }) }
function mk(p) { fs.mkdirSync(p, { recursive: true }) }
function cp(src, dst) {
  if (!fs.existsSync(src)) return
  mk(path.dirname(dst))
  if (fs.statSync(src).isDirectory()) fs.cpSync(src, dst, { recursive: true })
  else fs.copyFileSync(src, dst)
}

rmrf(OUT)
mk(OUT)

// 1. 站点（Pages 部署内容）
cp(SITE, path.join(OUT, 'site'))

// 2. 源数据（不含 exports，那个能重新生成）
cp(path.join(ROOT, 'content/styles/_index.json'), path.join(OUT, 'content/styles/_index.json'))
cp(path.join(ROOT, 'content/styles/_patched'), path.join(OUT, 'content/styles/_patched'))
cp(path.join(ROOT, 'content/styles/_generated'), path.join(OUT, 'content/styles/_generated'))
cp(path.join(ROOT, 'content/prompts'), path.join(OUT, 'content/prompts'))
cp(path.join(ROOT, 'content/templates'), path.join(OUT, 'content/templates'))

// 3. 工具
for (const f of ['build-style-index.mjs', 'build-site.mjs', 'export-bundle.mjs', 'verify-patches.mjs', 'gen-stills.py']) {
  cp(path.join(ROOT, 'tools', f), path.join(OUT, 'tools', f))
}

// 4. 文档
cp(path.join(ROOT, 'docs/api-exports.md'), path.join(OUT, 'docs/api-exports.md'))

// 5. workflow
mk(path.join(OUT, '.github/workflows'))

fs.writeFileSync(path.join(OUT, '.github/workflows/pages.yml'), `name: Deploy site

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
`, 'utf8')

fs.writeFileSync(path.join(OUT, '.gitignore'), `node_modules/
dist/
content/exports/
_audit/
_dev/
*.log
.DS_Store
`, 'utf8')

// 6. README
fs.writeFileSync(path.join(OUT, 'README.md'), `# AI 工作流 · 视频风格库

340 个代码动画风格的提示词、8 个可复用提示词、5 个代码模板，附带静态浏览站。

在线预览：部署到 GitHub Pages 后访问 \`https://<用户名>.github.io/<仓库名>/\`

![预览](site/stills/S1-A3.jpg)

## 内容

| 类别 | 数量 | 说明 |
|---|---|---|
| 视频风格 | 340 | 每个都有完整提示词 + 示意图（193 张原作者参考图 + 147 张按提示词渲染的示意帧） |
| 提示词 | 8 | MV 分镜、风格改写、代码模板生成、短视频脚本等 |
| 代码模板 | 5 | Fastify / React / Zod / FastAPI / Python CLI |

其中 **70 个原本只有一句话的风格**（S3 卡通 38、S10 中国风 13、S2 版式 11、S5 动态 8）已补全为可执行的完整提示词，放在 \`content/styles/_patched/\`，不改动原始库。

## 目录结构

\`\`\`
.
├── site/                  # 静态站点（GitHub Pages 部署目录）
│   ├── index.html
│   ├── data.js            # 内联数据（340 条 md + 元数据）
│   └── stills/            # 340 张示意图
├── content/               # 源数据
│   ├── styles/_index.json # 340 条索引
│   ├── styles/_patched/   # 70 条补全版提示词（覆盖层）
│   ├── styles/_generated/ # 147 张渲染示意图
│   ├── prompts/           # 8 个提示词
│   └── templates/         # 5 个代码模板
├── tools/                 # 构建脚本（索引 / 站点 / 导出）
├── docs/api-exports.md    # 数据接口说明
└── .github/workflows/     # 自动部署 Pages
\`\`\`

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库（不要勾选 README）
2. 把本目录内容推上去：

\`\`\`bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
\`\`\`

3. 仓库 **Settings → Pages → Source** 选 **GitHub Actions**
4. 等 1-2 分钟，访问 \`https://<用户名>.github.io/<仓库名>/\`

workflow 已配好，之后每次 push 自动更新。

## 部署到 Netlify（不注册也能先看）

把 zip 拖到 https://app.netlify.com/drop 即可，注册后可长期保留。

## 在其他程序里调用

### 读文件

\`\`\`python
import json
styles = json.load(open('site/data.js')[0:0])  # 或用 content/styles/_index.json
\`\`\`

更简单：直接读 \`content/styles/_index.json\` + \`content/styles/_patched/<id>.md\`。

### 生成完整数据包

\`\`\`bash
node tools/export-bundle.mjs   # 输出 content/exports/（JSON + md + jpg）
node tools/build-site.mjs      # 重建站点
\`\`\`

详见 [docs/api-exports.md](docs/api-exports.md)。

## 作为 DSH 插件使用

本仓库的 \`plugin/\` 目录是一个 DeepSeek Harness 插件（侧边栏面板 + \`/awkit\` 命令），安装方式见原项目。

## 许可证

- 视频风格提示词来自公开代码动画风格库，仅供学习与个人创作
- 193 张参考图版权归原作者
- 147 张示意图、提示词补全、模板、站点代码：MIT
`, 'utf8')

fs.writeFileSync(path.join(OUT, 'LICENSE'), `MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`, 'utf8')

const size = (p) => {
  let s = 0
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const q = path.join(p, e.name)
    s += e.isDirectory() ? size(q) : fs.statSync(q).size
  }
  return s
}
console.log('GitHub 发布目录构建完成')
console.log('  路径:', OUT)
console.log('  体积:', (size(OUT) / 1024 / 1024).toFixed(2), 'MB')
