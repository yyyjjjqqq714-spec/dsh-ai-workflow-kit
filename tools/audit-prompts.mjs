import fs from 'node:fs'
import path from 'node:path'

const SRC = 'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词'
const IDX = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit/content/styles/_index.json'

const rows = JSON.parse(fs.readFileSync(IDX, 'utf8'))

// 结构化字段解析
const FIELDS = ['分类', '长什么样', '适合', '关键词']

function parse(md) {
  const out = { chars: md.length, fields: {}, hasCode: /```/.test(md), hasPrompt: /##\s*风格提示词/.test(md) }
  for (const f of FIELDS) {
    const m = md.match(new RegExp('[-*]\\s*' + f + '\\s*[：:]\\s*(.+)'))
    out.fields[f] = m ? m[1].trim() : null
  }
  // 风格提示词正文长度
  const pm = md.match(/##\s*风格提示词[\s\S]*?\n\n([\s\S]*)$/)
  out.promptBody = pm ? pm[1].trim() : ''
  // 正文是否只有一句话（<=60 字且无换行）
  out.thin = out.promptBody.length <= 60 || out.promptBody.split('\n').filter(Boolean).length <= 1
  return out
}

const stats = {
  total: rows.length,
  missing: { 分类: 0, 长什么样: 0, 适合: 0, 关键词: 0 },
  thin: 0,
  noCode: 0,
  short: 0,
  chars: [],
  bySeries: {},
}

for (const r of rows) {
  const md = fs.readFileSync(path.join(SRC, r.file), 'utf8')
  const p = parse(md)
  stats.chars.push(p.chars)
  for (const f of FIELDS) if (!p.fields[f]) stats.missing[f]++
  if (p.thin) stats.thin++
  if (!p.hasCode) stats.noCode++
  if (p.chars < 400) stats.short++

  const s = (stats.bySeries[r.series] ||= { n: 0, thin: 0, avg: 0, sum: 0 })
  s.n++
  s.sum += p.chars
  if (p.thin) s.thin++
}

const avg = Math.round(stats.chars.reduce((a, b) => a + b, 0) / stats.chars.length)
const sorted = [...stats.chars].sort((a, b) => a - b)

console.log('=== 340 个风格提示词质量体检 ===')
console.log(`总数: ${stats.total}`)
console.log(`字符数: 均值 ${avg} / 中位 ${sorted[Math.floor(sorted.length / 2)]} / 最小 ${sorted[0]} / 最大 ${sorted[sorted.length - 1]}`)
console.log(`\n字段缺失:`)
for (const [k, v] of Object.entries(stats.missing)) console.log(`  ${k.padEnd(6)} 缺失 ${v} 条 (${(v / stats.total * 100).toFixed(1)}%)`)
console.log(`\n提示词正文过短(≤60字或单行): ${stats.thin} 条 (${(stats.thin / stats.total * 100).toFixed(1)}%)`)
console.log(`无代码示例: ${stats.noCode} 条`)
console.log(`总字符 < 400: ${stats.short} 条`)

console.log('\n=== 按系列 ===')
for (const [k, v] of Object.entries(stats.bySeries)) {
  console.log(`  ${k.padEnd(4)} n=${String(v.n).padStart(3)} 均值${String(Math.round(v.sum / v.n)).padStart(5)}字 过短${String(v.thin).padStart(2)}条`)
}
