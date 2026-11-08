#!/usr/bin/env node
/**
 * 把 dsh-ai-workflow-kit 插入 awesome-dsh-plugin 列表的「工作流与自动化」段。
 * 保持 owner 字母序，只加一行，不改动任何其他内容。
 *
 * 输入：%TEMP%\awesome-readme.md（英文）、%TEMP%\awesome-readme-zh.md（中文）
 * 输出：同名 .new 文件
 */
import { readFileSync, writeFileSync } from 'node:fs'

const OWNER = 'yyyjjjqqq714-spec'
const REPO = 'dsh-ai-workflow-kit'
const URL_ = `https://github.com/${OWNER}/${REPO}`

const TMP = process.env.TEMP || process.env.TMP

const EN_DESC =
  '340-entry code-animation style library, 8 prompt templates and 5 renderable code templates in a sidebar panel, plus agent tools (awkit_search / awkit_get_style / awkit_render_template) so the model can pick a style and render a template during a turn; content ships inside the package, no extra download.'

const ZH_DESC =
  '340 条代码动画风格库、8 个提示词模板与 5 个可渲染代码模板，集成在侧栏面板；同一套内容也作为 Agent 工具（awkit_search / awkit_get_style / awkit_render_template）供模型在对话中检索与渲染；内容随包分发，无需额外下载。'

function insertInto(text, sectionPrefix, entry) {
  if (text.includes(`[${OWNER}/${REPO}]`)) return { text, changed: false, reason: 'already present' }

  const start = text.indexOf(sectionPrefix)
  if (start < 0) return { text, changed: false, reason: 'section not found: ' + sectionPrefix }

  // 段结束：下一个同级或更高级标题
  const level = (sectionPrefix.match(/^#+/) || ['###'])[0].length
  let end = text.length
  const re = new RegExp(`^#{1,${level}}\\s`, 'gm')
  re.lastIndex = start + sectionPrefix.length
  const m = re.exec(text)
  if (m) end = m.index

  const seg = text.slice(start, end)
  const lines = seg.split('\n')

  const target = OWNER.toLowerCase()
  let insertAt = -1
  for (let i = 0; i < lines.length; i++) {
    const mm = /^- \[([^\]/]+)\//.exec(lines[i])
    if (!mm) continue
    const owner = mm[1].toLowerCase()
    if (owner.localeCompare(target, 'en') > 0) {
      insertAt = i
      break
    }
  }
  if (insertAt < 0) {
    // 段里没有更大的 owner，插在段内最后一条之后
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/^- \[/.test(lines[i])) {
        insertAt = i + 1
        break
      }
    }
  }
  if (insertAt < 0) return { text, changed: false, reason: 'no insertion point' }

  lines.splice(insertAt, 0, entry)
  const newSeg = lines.join('\n')
  return { text: text.slice(0, start) + newSeg + text.slice(end), changed: true, reason: 'inserted at line ' + insertAt }
}

const jobs = [
  { src: `${TMP}\\awesome-readme.md`, out: `${TMP}\\awesome-readme.md.new`, section: '### Workflow & Automation', desc: EN_DESC, sep: ' - ', label: 'EN' },
  { src: `${TMP}\\awesome-readme-zh.md`, out: `${TMP}\\awesome-readme-zh.md.new`, section: '### 🔁 工作流与自动化', desc: ZH_DESC, sep: ' — ', label: 'ZH' },
]

for (const j of jobs) {
  const text = readFileSync(j.src, 'utf8')
  const entry = `- [${OWNER}/${REPO}](${URL_})${j.sep}${j.desc}`
  const r = insertInto(text, j.section, entry)
  if (!r.changed) {
    console.log(`${j.label}: 未改动 (${r.reason})`)
    continue
  }
  writeFileSync(j.out, r.text, 'utf8')
  console.log(`${j.label}: ${r.reason}，新长度 ${r.text.length}（原 ${text.length}）`)
  // 打印前后 3 行做确认
  const idx = r.text.indexOf(`[${OWNER}/${REPO}]`)
  const around = r.text.slice(Math.max(0, idx - 220), idx + 260)
  console.log('--- 上下文 ---')
  console.log(around)
  console.log('')
}
