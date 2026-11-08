#!/usr/bin/env node
/**
 * 生成内容清单与增强索引。
 *
 * 输入：content/styles/_index.json（原始 340 条）+ content/styles/prompts/<id>.md
 * 输出：content/styles/_index.full.json   带 tags / summary，供检索与列表预览
 *       content/manifest.json            包内容版本、计数、分类统计
 *
 * 用法：node tools/build-content-manifest.mjs
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'content')
const PROMPTS = join(CONTENT, 'styles/prompts')

const STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'each', 'all',
  'are', 'not', 'but', 'can', 'use', 'used', 'when', 'then', 'than', 'one', 'two',
  'md', 'http', 'https', 'www', 'com', 'jpg', 'png',
])

function collectTags(md, name) {
  const tags = new Set()
  const lower = String(md || '').toLowerCase()
  // 英文技术词：出现两次以上的才算特征词
  const freq = new Map()
  for (const m of lower.matchAll(/[a-z][a-z0-9-]{3,}/g)) {
    const w = m[0]
    if (STOP.has(w)) continue
    freq.set(w, (freq.get(w) || 0) + 1)
  }
  for (const [w, n] of freq) if (n >= 2) tags.add(w)
  // 名称本身拆词
  for (const w of String(name || '').toLowerCase().split(/[\s·、,，/()（）]+/)) {
    if (w.length >= 2) tags.add(w)
  }
  return [...tags].sort().slice(0, 12)
}

function summarize(md, limit = 140) {
  const lines = String(md || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('>'))
  return lines.slice(0, 3).join(' ').slice(0, limit)
}

async function main() {
  const index = JSON.parse(await readFile(join(CONTENT, 'styles/_index.json'), 'utf8'))
  const full = []

  for (const s of index) {
    let md = ''
    try {
      md = await readFile(join(PROMPTS, s.id + '.md'), 'utf8')
    } catch {
      /* 缺原文时留空，前端会显示「正文为空」 */
    }
    full.push({
      id: s.id,
      name: s.name,
      series: s.series,
      hasStill: !!s.hasStill,
      chars: md.length,
      tags: collectTags(md, s.name),
      summary: summarize(md),
    })
  }

  await writeFile(join(CONTENT, 'styles/_index.full.json'), JSON.stringify(full, null, 2))

  const bySeries = {}
  for (const s of full) bySeries[s.series] = (bySeries[s.series] || 0) + 1

  const hash = createHash('sha256')
  for (const s of full) hash.update(s.id + ':' + s.chars + ';')

  // 缩略图也要进指纹：内容版本是客户端的图片缓存键，只算正文的话
  // 重新生成图片后版本不变，所有人会继续看旧图。
  const stillsDir = join(CONTENT, 'styles/stills')
  let stills = []
  try {
    stills = (await readdir(stillsDir)).sort()
  } catch {
    stills = []
  }
  for (const f of stills) {
    const st = await stat(join(stillsDir, f))
    hash.update('still:' + f + ':' + st.size + ';')
  }

  const contentVersion = hash.digest('hex').slice(0, 12)

  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
  const manifest = {
    name: pkg.name,
    version: pkg.version,
    contentVersion,
    builtAt: new Date().toISOString(),
    counts: {
      styles: full.length,
      stylesWithMarkdown: full.filter((s) => s.chars > 0).length,
      stylesWithStill: full.filter((s) => s.hasStill).length,
      bySeries,
    },
  }
  await writeFile(join(CONTENT, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log(`增强索引 ${full.length} 条，有原文 ${manifest.counts.stylesWithMarkdown} 条`)
  console.log('按系列:', JSON.stringify(bySeries))
  console.log('contentVersion:', contentVersion)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
