#!/usr/bin/env node
/**
 * 把外部风格库「烧进」本包，让插件脱离本机路径独立运行。
 *
 * 输入：content/styles/_index.json（340 条索引，file 字段指向外部源目录）
 *       EXTERNAL_STYLE_DIR 里的 <seriesDir>/<file>.md 与 .jpg
 * 输出：content/styles/prompts/<id>.md     风格原文（随包分发）
 *       content/styles/stills/<id>.jpg     缩略图（由 compress-stills.ps1 生成）
 *       tools/_build/stills-sources.json   图片来源清单（构建期用，含本机绝对路径，不进包）
 *
 * 用法：node tools/prepare-content.mjs
 */
import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'content')
const BUILD_DIR = join(ROOT, 'tools', '_build')
const EXTERNAL_STYLE_DIR =
  process.env.AWKIT_STYLE_SRC ||
  'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词'

const MD_OUT = join(CONTENT, 'styles/prompts')
const STILL_SRC_MAP = join(BUILD_DIR, 'stills-sources.json')
const GEN_DIR = join(CONTENT, 'styles/_generated')

async function main() {
  const index = JSON.parse(await readFile(join(CONTENT, 'styles/_index.json'), 'utf8'))
  await mkdir(MD_OUT, { recursive: true })
  await mkdir(BUILD_DIR, { recursive: true })

  const report = { total: index.length, mdCopied: 0, mdMissing: [], stills: [] }

  for (const s of index) {
    const srcMd = join(EXTERNAL_STYLE_DIR, s.file)
    if (existsSync(srcMd)) {
      await copyFile(srcMd, join(MD_OUT, s.id + '.md'))
      report.mdCopied++
    } else {
      report.mdMissing.push({ id: s.id, file: s.file })
    }

    // 缩略图候选顺序：原图 > 程序化示意图
    const candidates = []
    if (s.hasStill) candidates.push(join(EXTERNAL_STYLE_DIR, s.file.replace(/\.md$/i, '.jpg')))
    candidates.push(join(GEN_DIR, s.id + '.jpg'))
    const hit = candidates.find((p) => existsSync(p))
    report.stills.push({ id: s.id, source: hit || null, kind: hit && s.hasStill ? 'original' : 'generated' })
  }

  await writeFile(STILL_SRC_MAP, JSON.stringify(report.stills, null, 2))
  await writeFile(
    join(BUILD_DIR, 'prepare-report.json'),
    JSON.stringify({ ...report, stills: undefined, stillMissing: report.stills.filter((x) => !x.source).length }, null, 2),
  )

  console.log(`md 拷入 ${report.mdCopied}/${report.total}`)
  if (report.mdMissing.length) console.log('缺失:', report.mdMissing.slice(0, 5))
  const miss = report.stills.filter((x) => !x.source)
  console.log(`缩略图来源就绪 ${report.stills.length - miss.length}/${report.stills.length}`)
  if (miss.length) console.log('无图:', miss.slice(0, 5).map((x) => x.id))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
