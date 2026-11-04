// 把 ai-workflow-kit 的内容导出成可分发、可被外部程序调用的格式
// 输出: content/exports/
//   index.json          —— 总入口（版本、统计、各资源路径）
//   styles.json         —— 340 条风格元数据（含 hasStill/generated）
//   styles/{id}.md      —— 每个风格的原文提示词
//   styles/{id}.jpg     —— 示意图（有就导出）
//   prompts.json        —— 提示词索引
//   prompts/{slug}/vN.md
//   templates.json      —— 模板索引
//   templates/{path}/   —— template.json + files
//   api.md              —— 调用说明

import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit'
const SRC = 'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词'
const OUT = path.join(ROOT, 'content/exports')

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }) }
function mk(p) { fs.mkdirSync(p, { recursive: true }) }
function cp(src, dst) {
  mk(path.dirname(dst))
  if (fs.statSync(src).isDirectory()) fs.cpSync(src, dst, { recursive: true })
  else fs.copyFileSync(src, dst)
}

rmrf(OUT)
mk(OUT)

const styles = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/styles/_index.json'), 'utf8'))

// ---- styles ----
mk(path.join(OUT, 'styles'))
let mdCount = 0
let jpgCount = 0
let patchedCount = 0
const styleOut = styles.map((s) => {
  // 优先用本地补全版（_patched），没有再读原始库
  const patched = path.join(ROOT, 'content/styles/_patched', s.id + '.md')
  let md
  let source = 'original'
  if (fs.existsSync(patched)) {
    md = fs.readFileSync(patched, 'utf8')
    source = 'patched'
    patchedCount++
  } else {
    md = fs.readFileSync(path.join(SRC, s.file), 'utf8')
  }
  const clean = { ...s }
  delete clean.file
  clean.source = s.file
  clean.promptSource = source
  fs.writeFileSync(path.join(OUT, 'styles', s.id + '.md'), md, 'utf8')
  mdCount++

  const candidates = []
  if (s.hasStill) candidates.push(path.join(SRC, s.file.replace(/\.md$/i, '.jpg')))
  candidates.push(path.join(ROOT, 'content/styles/_generated', s.id + '.jpg'))
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      fs.copyFileSync(c, path.join(OUT, 'styles', s.id + '.jpg'))
      jpgCount++
      break
    }
  }
  return clean
})
fs.writeFileSync(path.join(OUT, 'styles.json'), JSON.stringify(styleOut, null, 2), 'utf8')

// ---- prompts ----
const promptsBase = path.join(ROOT, 'content/prompts')
const promptIdx = []
for (const d of fs.readdirSync(promptsBase, { withFileTypes: true })) {
  if (!d.isDirectory()) continue
  const dir = path.join(promptsBase, d.name)
  for (const f of fs.readdirSync(dir)) {
    if (!/^v\d+.*\.md$/i.test(f)) continue
    const md = fs.readFileSync(path.join(dir, f), 'utf8')
    const title = (md.split(/\r?\n/).find((l) => l.trim().startsWith('#')) || '').replace(/^#+\s*/, '').trim()
    promptIdx.push({ slug: d.name, version: f.replace(/\.md$/i, ''), title, chars: md.length })
    cp(path.join(dir, f), path.join(OUT, 'prompts', d.name, f))
  }
}
fs.writeFileSync(path.join(OUT, 'prompts.json'), JSON.stringify(promptIdx, null, 2), 'utf8')

// ---- templates ----
const tplBase = path.join(ROOT, 'content/templates')
const tplIdx = []
function walkTpl(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { walkTpl(p); continue }
    if (e.name !== 'template.json') continue
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    const rel = path.relative(tplBase, dir).replace(/\\/g, '/')
    tplIdx.push({
      id: j.id, title: j.title, description: j.description,
      lang: j.lang, framework: j.framework, kind: j.kind,
      vars: j.vars, files: j.files, path: rel,
    })
    cp(dir, path.join(OUT, 'templates', rel))
  }
}
walkTpl(tplBase)
fs.writeFileSync(path.join(OUT, 'templates.json'), JSON.stringify(tplIdx, null, 2), 'utf8')

// ---- index ----
const index = {
  name: 'ai-workflow-kit',
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  counts: {
    styles: styleOut.length,
    stylesWithOriginalStill: styleOut.filter((s) => s.hasStill).length,
    stylesWithGeneratedStill: styleOut.filter((s) => !s.hasStill).length,
    prompts: promptIdx.length,
    templates: tplIdx.length,
  },
  entrypoints: {
    styles: 'styles.json',
    styleMarkdown: 'styles/{id}.md',
    styleImage: 'styles/{id}.jpg',
    prompts: 'prompts.json',
    promptMarkdown: 'prompts/{slug}/{version}.md',
    templates: 'templates.json',
    templateDir: 'templates/{path}/',
  },
  usage: 'api.md',
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2), 'utf8')

// api.md 是手写文档，放在 docs/ 里（避免被 rmrf 清掉），每次导出复制过来
const apiDoc = path.join(ROOT, 'docs/api-exports.md')
if (fs.existsSync(apiDoc)) fs.copyFileSync(apiDoc, path.join(OUT, 'api.md'))

console.log(JSON.stringify(index.counts, null, 2))
console.log('md:', mdCount, 'jpg:', jpgCount)
