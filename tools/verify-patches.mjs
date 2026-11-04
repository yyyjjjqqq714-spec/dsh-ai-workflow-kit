import fs from 'node:fs'
import path from 'node:path'

const SRC = 'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词'
const IDX = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit/content/styles/_index.json'
const PATCH = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit/content/styles/_patched'

const rows = JSON.parse(fs.readFileSync(IDX, 'utf8'))

// 1. 找出所有应该补的（thin 且未 patch）
const need = []
for (const r of rows) {
  const md = fs.readFileSync(path.join(SRC, r.file), 'utf8').replace(/\r\n/g, '\n')
  const i = md.indexOf('## 风格提示词')
  const body = i >= 0 ? md.slice(i + '## 风格提示词'.length).trim() : ''
  const lines = body.split('\n').filter((l) => l.trim())
  const thin = body.length <= 60 || lines.length <= 1
  if (thin) need.push(r)
}

// 2. patch 覆盖情况
const patched = fs.existsSync(PATCH) ? fs.readdirSync(PATCH).filter((f) => f.endsWith('.md')) : []
const patchedSet = new Set(patched.map((f) => f.replace(/\.md$/, '')))
const missing = need.filter((r) => !patchedSet.has(r.id))
const done = need.filter((r) => patchedSet.has(r.id))

console.log(`=== 补全验收 ===`)
console.log(`原本过短: ${need.length}`)
console.log(`已补: ${done.length}`)
console.log(`未补: ${missing.length}${missing.length ? ' -> ' + missing.map((x) => x.id).join(', ') : ''}`)

// 3. 补全内容质量
const fields = ['长什么样', '适合', '关键词']
const problems = []
const sizes = []
for (const r of done) {
  const md = fs.readFileSync(path.join(PATCH, r.id + '.md'), 'utf8')
  sizes.push(md.length)
  const miss = fields.filter((f) => !new RegExp('[-*]\\s*' + f + '\\s*[：:]').test(md))
  const hasPrompt = md.includes('## 风格提示词')
  const hasRules = md.includes('画面规则')
  const hasRhythm = md.includes('动画节奏')
  const hasTech = md.includes('技术要点')
  if (miss.length || !hasPrompt || !hasRules || !hasRhythm || !hasTech) {
    problems.push({ id: r.id, chars: md.length, miss, hasPrompt, hasRules, hasRhythm, hasTech })
  }
  if (md.length < 300) problems.push({ id: r.id, chars: md.length, reason: 'too short' })
}

sizes.sort((a, b) => a - b)
if (sizes.length) {
  console.log(`\n字符数: 最小 ${sizes[0]} / 中位 ${sizes[Math.floor(sizes.length / 2)]} / 最大 ${sizes[sizes.length - 1]}`)
}
console.log(`结构问题: ${problems.length}`)
for (const p of problems.slice(0, 15)) console.log('  ', JSON.stringify(p))
