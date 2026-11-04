// 构建可部署的静态站点：dist/site/
// 特点：数据内联成 data.js（file:// 双击也能用），图片走相对路径
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit'
const SRC = 'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词'
const OUT = path.join(ROOT, 'dist/site')

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true })

const styles = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/styles/_index.json'), 'utf8'))

// ---- 组装数据 ----
const styleItems = []
let stillCount = 0
for (const s of styles) {
  const patched = path.join(ROOT, 'content/styles/_patched', s.id + '.md')
  const md = fs.existsSync(patched)
    ? fs.readFileSync(patched, 'utf8')
    : fs.readFileSync(path.join(SRC, s.file), 'utf8')

  // 图片：原图优先，否则生成的示意图
  const cands = []
  if (s.hasStill) cands.push(path.join(SRC, s.file.replace(/\.md$/i, '.jpg')))
  cands.push(path.join(ROOT, 'content/styles/_generated', s.id + '.jpg'))
  let still = null
  for (const c of cands) {
    if (fs.existsSync(c)) {
      fs.copyFileSync(c, path.join(OUT, 'stills', s.id + '.jpg'))
      still = 'stills/' + s.id + '.jpg'
      stillCount++
      break
    }
  }
  styleItems.push({
    id: s.id, name: s.name, series: s.series,
    hasStill: !!s.hasStill,
    patched: fs.existsSync(patched),
    still,
    markdown: md,
  })
}

// ---- 提示词 / 模板 ----
const prompts = []
const pbase = path.join(ROOT, 'content/prompts')
for (const d of fs.readdirSync(pbase, { withFileTypes: true })) {
  if (!d.isDirectory()) continue
  for (const f of fs.readdirSync(path.join(pbase, d.name))) {
    if (!/^v\d+.*\.md$/i.test(f)) continue
    const md = fs.readFileSync(path.join(pbase, d.name, f), 'utf8')
    const title = (md.split(/\r?\n/).find((l) => l.trim().startsWith('#')) || '').replace(/^#+\s*/, '').trim()
    prompts.push({ slug: d.name, version: f.replace(/\.md$/i, ''), title, markdown: md })
  }
}

const templates = []
function walkTpl(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { walkTpl(p); continue }
    if (e.name !== 'template.json') continue
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    templates.push({ ...j, path: path.relative(path.join(ROOT, 'content/templates'), dir).replace(/\\/g, '/') })
  }
}
walkTpl(path.join(ROOT, 'content/templates'))

const data = {
  builtAt: new Date().toISOString(),
  styles: styleItems,
  prompts,
  templates,
}

// data.js —— 用 script 标签加载，绕开 file:// 的 fetch 限制
fs.writeFileSync(
  path.join(OUT, 'data.js'),
  'window.AWKIT_DATA = ' + JSON.stringify(data) + ';\n',
  'utf8',
)

console.log('站点构建完成')
console.log('  风格:', styleItems.length, '（有图', stillCount, '）')
console.log('  提示词:', prompts.length, ' 模板:', templates.length)
const size = fs.statSync(path.join(OUT, 'data.js')).size
console.log('  data.js:', (size / 1024 / 1024).toFixed(2), 'MB')
