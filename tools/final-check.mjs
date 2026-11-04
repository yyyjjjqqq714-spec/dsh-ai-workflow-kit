import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit'
const SRC = 'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词'
const IDX = path.join(ROOT, 'content/styles/_index.json')

const rows = JSON.parse(fs.readFileSync(IDX, 'utf8'))
const ok = []
const bad = []

// 1. 索引完整
if (rows.length !== 340) bad.push(`索引条数 ${rows.length} != 340`)
else ok.push('索引 340 条')

// 2. 每个风格都有图
let stillCount = 0
const noStill = []
for (const r of rows) {
  const cands = []
  if (r.hasStill) cands.push(path.join(SRC, r.file.replace(/\.md$/i, '.jpg')))
  cands.push(path.join(ROOT, 'content/styles/_generated', r.id + '.jpg'))
  const found = cands.find((c) => fs.existsSync(c))
  if (found) stillCount++
  else noStill.push(r.id)
}
if (noStill.length) bad.push(`缺图 ${noStill.length}: ${noStill.slice(0, 5).join(',')}`)
else ok.push(`示意图 ${stillCount}/340`)

// 3. 补全层
const patchDir = path.join(ROOT, 'content/styles/_patched')
const patched = fs.readdirSync(patchDir).filter((f) => f.endsWith('.md'))
const pProblems = []
for (const f of patched) {
  const md = fs.readFileSync(path.join(patchDir, f), 'utf8')
  const need = ['长什么样', '适合', '关键词', '画面规则', '动画节奏', '技术要点']
  const miss = need.filter((k) => !md.includes(k))
  if (miss.length || md.length < 300) pProblems.push(f + ' ' + miss.join('/'))
}
if (pProblems.length) bad.push(`补全问题 ${pProblems.length}`)
else ok.push(`补全版 ${patched.length} 条全部合格`)

// 4. 提示词 / 模板
const prompts = []
for (const d of fs.readdirSync(path.join(ROOT, 'content/prompts'), { withFileTypes: true })) {
  if (d.isDirectory()) prompts.push(d.name)
}
const tpls = []
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name === 'template.json') tpls.push(path.relative(path.join(ROOT, 'content/templates'), d).replace(/\\/g, '/'))
  }
}
walk(path.join(ROOT, 'content/templates'))
ok.push(`提示词 ${prompts.length} 条`)

// 5. 站点 / 导出 / 打包
const checks = [
  ['站点 index.html', path.join(ROOT, 'dist/site/index.html')],
  ['站点 data.js', path.join(ROOT, 'dist/site/data.js')],
  ['导出包 index.json', path.join(ROOT, 'content/exports/index.json')],
  ['GitHub 目录', path.join(ROOT, 'dist/github/README.md')],
  ['Pages workflow', path.join(ROOT, 'dist/github/.github/workflows/pages.yml')],
]
for (const [name, p] of checks) {
  if (fs.existsSync(p)) ok.push(name)
  else bad.push('缺 ' + name)
}

// 6. 站点图数量
const siteStills = fs.readdirSync(path.join(ROOT, 'dist/site/stills')).filter((f) => f.endsWith('.jpg'))
ok.push(`站点图 ${siteStills.length} 张`)

// 7. zip
const zips = fs.readdirSync(path.join(ROOT, 'dist')).filter((f) => f.endsWith('.zip'))
ok.push(`压缩包 ${zips.length} 个`)

console.log('=== 总验收 ===')
console.log('通过:')
for (const o of ok) console.log('  ✓', o)
if (bad.length) {
  console.log('失败:')
  for (const b of bad) console.log('  ✗', b)
} else {
  console.log('\n全部通过 ✅')
}
process.exit(bad.length ? 1 : 0)
