import fs from 'node:fs'
import path from 'node:path'

const SRC = 'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词'
const IDX = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit/content/styles/_index.json'
const PATCH = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit/content/styles/_patched'

const rows = JSON.parse(fs.readFileSync(IDX, 'utf8'))
const out = []

for (const r of rows) {
  const md = fs.readFileSync(path.join(SRC, r.file), 'utf8').replace(/\r\n/g, '\n')
  const i = md.indexOf('## 风格提示词')
  const body = i >= 0 ? md.slice(i + '## 风格提示词'.length).trim() : ''
  const lines = body.split('\n').filter((l) => l.trim())
  const thin = body.length <= 60 || lines.length <= 1
  const patched = fs.existsSync(path.join(PATCH, r.id + '.md'))
  if (thin && !patched) out.push({ series: r.series, id: r.id, name: r.name, len: body.length })
}

console.log('待补:', out.length)
const g = {}
for (const o of out) (g[o.series] ||= []).push(o)
for (const k of Object.keys(g)) {
  console.log(`=== ${k} (${g[k].length}) ===`)
  for (const o of g[k]) console.log(`  ${o.id} | ${o.name} | ${o.len}字`)
}
