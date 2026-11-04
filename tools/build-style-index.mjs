// 扫描风格库源目录，生成 content/styles/_index.json
// 只做"目录级"索引：id / name / series / file / hasStill
// 完整 19 字段条目留到 MVP-3 手工做。

import fs from 'node:fs'
import path from 'node:path'

const SRC = 'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词'
const OUT = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit/content/styles/_index.json'

// 系列目录 → 系列代号
const SERIES_MAP = {
  'A-G_代码样片': 'S1',
  'H_现成版式': 'S2',
  'K_卡通画风': 'S3',
  'L_Lemo-Opuscar': 'S4',
  'M_动态风格': 'S5',
  'O_奥斯卡98部': 'S6',
  'R_照参考学来的': 'S7',
  'V_mg-styles-15': 'S8',
  'X_code-video': 'S9',
  'Z_中国风': 'S10',
}

const rows = []

for (const [dirName, series] of Object.entries(SERIES_MAP)) {
  const full = path.join(SRC, dirName)
  if (!fs.existsSync(full)) {
    console.warn('[skip] 目录不存在:', full)
    continue
  }
  const files = fs.readdirSync(full).filter(f => f.toLowerCase().endsWith('.md'))

  for (const file of files) {
    // 文件名形如 "A3_大字冲击.md" / "Z1_水墨.md"
    const base = file.replace(/\.md$/i, '')
    const m = base.match(/^([A-Za-z]+\d*)[_\-—\s]+(.+)$/)
    const rawId = m ? m[1] : base
    const rawName = m ? m[2].trim() : base

    // 预览图：同名 .jpg
    const jpgName = base + '.jpg'
    const hasStill = fs.existsSync(path.join(full, jpgName))

    rows.push({
      id: `${series}-${rawId}`,
      name: rawName,
      series,
      seriesDir: dirName,
      file: `${dirName}/${file}`,
      hasStill,
    })
  }
}

// 排序：系列 → id 数字自然序
rows.sort((a, b) => {
  if (a.series !== b.series) return a.series.localeCompare(b.series)
  return a.id.localeCompare(b.id, undefined, { numeric: true })
})

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(rows, null, 2), 'utf8')

console.log(`写入 ${rows.length} 条 -> ${OUT}`)
const bySeries = {}
for (const r of rows) bySeries[r.series] = (bySeries[r.series] || 0) + 1
console.log('按系列:', JSON.stringify(bySeries, null, 0))
console.log('前 5 条:')
for (const r of rows.slice(0, 5)) console.log(' ', r.id, '|', r.name, '| still:', r.hasStill)
