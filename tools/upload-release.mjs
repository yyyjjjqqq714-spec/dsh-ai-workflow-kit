#!/usr/bin/env node
/**
 * 创建 GitHub Release 并上传 tarball 资产。
 *
 * 环境变量：
 *   GH_TOKEN   必填
 *   REPO       owner/repo，默认 yyyjjjqqq714-spec/dsh-ai-workflow-kit
 *   TAG        tag 名，默认 v0.2.1
 *   FILE       tarball 路径
 *   ASSET_NAME 资产名（默认 dsh-ai-workflow-kit.tgz，去掉版本号让
 *              releases/latest/download/<name> 永久有效）
 */
import { readFileSync } from 'node:fs'

const TOKEN = process.env.GH_TOKEN
if (!TOKEN) { console.error('缺少 GH_TOKEN'); process.exit(1) }
const REPO = process.env.REPO || 'yyyjjjqqq714-spec/dsh-ai-workflow-kit'
const TAG = process.env.TAG || 'v0.2.1'
const FILE = process.env.FILE
const ASSET = process.env.ASSET_NAME || 'dsh-ai-workflow-kit.tgz'
if (!FILE) { console.error('缺少 FILE'); process.exit(1) }

const auth = {
  Authorization: `Bearer ${TOKEN}`,
  'User-Agent': 'awkit-publisher',
  Accept: 'application/vnd.github+json',
}

const body = `## 0.2.1

Docs-only follow-up to 0.2.0.

- Document that DSH's plugin manager drives pnpm, which ignores the OS proxy
  settings: on networks where GitHub is slow, set \`HTTPS_PROXY\` before
  \`dsh plugin add\`, otherwise the install fails with \`ETIMEDOUT\`.
- No functional change: same 340 styles, 8 prompts, 5 templates.

**Install**

\`\`\`sh
dsh plugin --profile web add "https://github.com/${REPO}/releases/latest/download/${ASSET}"
\`\`\`
`

let release
const res = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tag_name: TAG,
    target_commitish: 'main',
    name: TAG,
    body,
    draft: false,
    prerelease: false,
  }),
})
const txt = await res.text()
if (!res.ok) { console.error(`创建 release 失败 ${res.status}: ${txt.slice(0, 600)}`); process.exit(1) }
release = JSON.parse(txt)
console.log(`release: ${release.html_url} (id ${release.id})`)

const bytes = readFileSync(FILE)
console.log(`上传 ${ASSET} (${(bytes.length / 1048576).toFixed(2)} MB) ...`)
const up = await fetch(
  `https://uploads.github.com/repos/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(ASSET)}`,
  {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/octet-stream' },
    body: bytes,
  },
)
const upTxt = await up.text()
if (!up.ok) { console.error(`上传失败 ${up.status}: ${upTxt.slice(0, 600)}`); process.exit(1) }
const asset = JSON.parse(upTxt)
console.log(`asset: ${asset.name} ${asset.size} 字节`)
console.log(`download: ${asset.browser_download_url}`)
