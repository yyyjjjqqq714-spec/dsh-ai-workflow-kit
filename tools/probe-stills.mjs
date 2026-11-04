import fs from 'node:fs'

const IDX = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit/content/styles/_index.json'
const SRC = 'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词/'

const rows = JSON.parse(fs.readFileSync(IDX, 'utf8'))

const by = {}
for (const r of rows) {
  by[r.series] = by[r.series] || { t: 0, w: 0 }
  by[r.series].t++
  if (r.hasStill) by[r.series].w++
}
console.log('=== 缺图分布 ===')
let miss = 0
for (const [k, v] of Object.entries(by)) {
  console.log(k, '总' + v.t, '有图' + v.w, '缺' + (v.t - v.w))
  miss += v.t - v.w
}
console.log('缺图合计:', miss)

console.log('\n=== 抽查无图 md 的代码块 ===')
const samples = rows.filter((r) => !r.hasStill && ['S3', 'S8', 'S10', 'S2'].includes(r.series)).slice(0, 5)
for (const s of samples) {
  const md = fs.readFileSync(SRC + s.file, 'utf8')
  const fences = (md.match(/```/g) || []).length / 2
  console.log(` ${s.id} | ${s.name} | 字符 ${md.length} | 代码块 ${fences}`)
  const m = md.match(/```[a-z]*\n([\s\S]{0,180})/)
  if (m) console.log('   首块片段:', m[1].replace(/\n/g, ' ').slice(0, 140))
}

console.log('\n=== 各系列目录里有没有公共函数.js ===')
const dirs = [...new Set(rows.map((r) => r.seriesDir))]
for (const d of dirs) {
  const p = SRC + d
  let files = []
  try { files = fs.readdirSync(p).filter((f) => f.endsWith('.js')) } catch {}
  console.log(' ', d, '| js 文件:', files.length ? files.join(', ') : '(无)')
}
