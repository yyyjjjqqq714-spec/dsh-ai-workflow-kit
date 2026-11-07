/**
 * 内容层：把 content/ 下的纯文件读成结构化数据。
 *
 * 设计原则
 * 1. 零外部依赖，只用 node:fs / node:path —— 装到任何机器都不用联网。
 * 2. 所有路径从 import.meta.url 推导，绝不写死本机绝对路径。
 * 3. 读盘结果按 (mtime, size) 缓存，热更新内容不必重启。
 * 4. 失败返回带 code 的错误对象，由路由层决定 HTTP 状态。
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export class ContentError extends Error {
  constructor(code, message, status = 500) {
    super(message)
    this.name = 'ContentError'
    this.code = code
    this.status = status
  }
}

const SERIES_META = {
  S1: { label: '代码样片', hue: '#4f7cff' },
  S2: { label: '现成版式', hue: '#8b5cf6' },
  S3: { label: '卡通画风', hue: '#f59e0b' },
  S4: { label: 'Lemo·Opuscar', hue: '#ec4899' },
  S5: { label: '动态风格', hue: '#14b8a6' },
  S6: { label: '奥斯卡 98 部', hue: '#ef4444' },
  S7: { label: '照参考学来的', hue: '#84cc16' },
  S8: { label: 'mg-styles-15', hue: '#06b6d4' },
  S9: { label: 'code-video', hue: '#a855f7' },
  S10: { label: '中国风', hue: '#64748b' },
}

/** 带 mtime 失效的文件缓存，避免每个请求都重新读盘。 */
class FileCache {
  constructor() {
    this.entries = new Map()
  }

  async json(absPath, fallback) {
    let info
    try {
      info = await stat(absPath)
    } catch {
      return fallback
    }
    const stamp = `${info.mtimeMs}:${info.size}`
    const hit = this.entries.get(absPath)
    if (hit && hit.stamp === stamp) return hit.value

    let value
    try {
      value = JSON.parse(await readFile(absPath, 'utf8'))
    } catch {
      return fallback
    }
    this.entries.set(absPath, { stamp, value })
    return value
  }

  async text(absPath) {
    let info
    try {
      info = await stat(absPath)
    } catch {
      return null
    }
    const stamp = `${info.mtimeMs}:${info.size}`
    const hit = this.entries.get(absPath)
    if (hit && hit.stamp === stamp) return hit.value
    const value = await readFile(absPath, 'utf8')
    this.entries.set(absPath, { stamp, value })
    return value
  }

  invalidate() {
    this.entries.clear()
  }
}

/** 从 markdown 取第一个标题，取不到用 fallback。 */
function firstHeading(md, fallback) {
  if (!md) return fallback
  for (const line of md.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    if (t.startsWith('#')) {
      const clean = t.replace(/^#+\s*/, '').trim()
      if (clean) return clean
      continue
    }
    break
  }
  return fallback
}

/** 取正文里除标题外的前 N 个非空行，做列表预览。 */
function previewOf(md, limit = 2, maxLen = 120) {
  if (!md) return ''
  const lines = md
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('|---') && !l.startsWith('|'))
  return lines.slice(0, limit).join(' ').slice(0, maxLen)
}

/** 把一段文本切成可检索的词元：中文按字、英文按词，都转小写。 */
export function tokenize(text) {
  const out = new Set()
  const s = String(text || '').toLowerCase()
  for (const m of s.matchAll(/[a-z0-9]+/g)) out.add(m[0])
  for (const ch of s.replace(/[^\u4e00-\u9fa5]/g, '')) out.add(ch)
  return out
}

/**
 * 创建内容服务。
 * @param {{contentRoot?: string}} options
 */
export function createContentService(options = {}) {
  const root = options.contentRoot || join(PKG_ROOT, 'content')
  const cache = new FileCache()

  const P = {
    stylesIndex: join(root, 'styles', '_index.json'),
    stylesFull: join(root, 'styles', '_index.full.json'),
    styleMd: (id) => join(root, 'styles', 'prompts', id + '.md'),
    styleStill: (id) => join(root, 'styles', 'stills', id + '.jpg'),
    promptsDir: join(root, 'prompts'),
    templatesDir: join(root, 'templates'),
    manifest: join(root, 'manifest.json'),
  }

  async function loadStyles() {
    // 优先用构建期生成的增强索引（带 tags / summary），没有就退回原始索引
    const full = await cache.json(P.stylesFull, null)
    const base = full || (await cache.json(P.stylesIndex, []))
    if (!Array.isArray(base)) throw new ContentError('CONTENT_BAD_INDEX', '风格索引格式不正确')
    return base
  }

  async function loadManifest() {
    return cache.json(P.manifest, null)
  }

  async function scanPrompts() {
    let dirs
    try {
      dirs = await readdir(P.promptsDir, { withFileTypes: true })
    } catch {
      return []
    }
    const out = []
    for (const d of dirs) {
      if (!d.isDirectory()) continue
      const slug = d.name
      let files
      try {
        files = (await readdir(join(P.promptsDir, slug))).filter((f) => /^v\d+.*\.md$/i.test(f))
      } catch {
        continue
      }
      for (const f of files) {
        const md = await cache.text(join(P.promptsDir, slug, f))
        out.push({
          slug,
          version: f.replace(/\.md$/i, ''),
          title: firstHeading(md, slug),
          chars: md ? md.length : 0,
          preview: previewOf(md, 2, 120),
        })
      }
    }
    return out.sort((a, b) => a.slug.localeCompare(b.slug) || a.version.localeCompare(b.version))
  }

  async function scanTemplates() {
    const out = []
    async function walk(dir) {
      let entries
      try {
        entries = await readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const e of entries) {
        const full = join(dir, e.name)
        if (e.isDirectory()) {
          await walk(full)
        } else if (e.name === 'template.json') {
          const j = await cache.json(full, null)
          if (!j) continue
          out.push({
            id: j.id || dir.slice(root.length + 1),
            title: j.title || j.id,
            description: j.description || '',
            lang: j.lang || '',
            framework: j.framework || '',
            kind: j.kind || '',
            vars: Array.isArray(j.vars) ? j.vars.length : 0,
            files: Array.isArray(j.files) ? j.files.length : 0,
            path: dir.slice(root.length + 1).split('\\').join('/'),
          })
        }
      }
    }
    await walk(P.templatesDir)
    return out.sort((a, b) => String(a.id).localeCompare(String(b.id)))
  }

  /** 总览：一次拿齐三块列表 + 统计。 */
  async function overview() {
    const [styles, prompts, templates, manifest] = await Promise.all([
      loadStyles(),
      scanPrompts(),
      scanTemplates(),
      loadManifest(),
    ])
    const bySeries = {}
    for (const s of styles) bySeries[s.series] = (bySeries[s.series] || 0) + 1

    return {
      ok: true,
      version: manifest && manifest.version,
      contentVersion: manifest && manifest.contentVersion,
      styles: {
        total: styles.length,
        bySeries,
        series: SERIES_META,
        items: styles.map((s) => ({
          id: s.id,
          name: s.name,
          series: s.series,
          tags: s.tags || [],
          summary: s.summary || '',
          hasStill: !!s.hasStill,
        })),
      },
      prompts: { total: prompts.length, items: prompts },
      templates: { total: templates.length, items: templates },
    }
  }

  async function getStyle(id) {
    if (!id) throw new ContentError('MISSING_ID', '缺少 id', 400)
    const styles = await loadStyles()
    const row = styles.find((s) => s.id === id)
    if (!row) throw new ContentError('STYLE_NOT_FOUND', '风格不存在: ' + id, 404)

    const markdown = (await cache.text(P.styleMd(row.id))) || ''
    return {
      ok: true,
      id: row.id,
      name: row.name,
      series: row.series,
      seriesLabel: (SERIES_META[row.series] || {}).label || row.series,
      tags: row.tags || [],
      hasStill: !!row.hasStill,
      markdown,
      chars: markdown.length,
    }
  }

  async function getStillPath(id) {
    const styles = await loadStyles()
    const row = styles.find((s) => s.id === id)
    if (!row) return null
    const p = P.styleStill(row.id)
    return existsSync(p) ? p : null
  }

  async function getPrompt(slug, version) {
    if (!slug || !version) throw new ContentError('MISSING_PARAM', '缺少 slug 或 version', 400)
    if (!/^[\w.-]+$/.test(slug) || !/^[\w.-]+$/.test(version)) {
      throw new ContentError('BAD_PARAM', '参数含非法字符', 400)
    }
    const md = await cache.text(join(P.promptsDir, slug, version + '.md'))
    if (md == null) throw new ContentError('PROMPT_NOT_FOUND', '提示词不存在', 404)
    return { ok: true, slug, version, title: firstHeading(md, slug), markdown: md, chars: md.length }
  }

  async function getTemplate(relPath) {
    if (!relPath) throw new ContentError('MISSING_PATH', '缺少 path', 400)
    const clean = String(relPath).replace(/\\/g, '/')
    if (clean.includes('..') || clean.startsWith('/')) {
      throw new ContentError('BAD_PATH', '非法路径', 400)
    }
    const t = await cache.json(join(P.templatesDir, clean, 'template.json'), null)
    if (!t) throw new ContentError('TEMPLATE_NOT_FOUND', '模板不存在', 404)

    // 一并返回模板文件内容，前端可直接预览渲染结果
    const files = []
    for (const f of Array.isArray(t.files) ? t.files : []) {
      const content = await cache.text(join(P.templatesDir, clean, f.from))
      files.push({ from: f.from, to: f.to, content })
    }
    return { ok: true, path: clean, template: t, files }
  }

  /** 关键词检索：id 精确 > id 前缀 > 名称 > 标签 > 正文。 */
  async function search(query, kind = 'styles', limit = 30) {
    const q = String(query || '').trim().toLowerCase()
    if (!q) return { ok: true, kind, total: 0, items: [] }

    if (kind === 'styles') {
      const styles = await loadStyles()
      const scored = []
      for (const s of styles) {
        const id = String(s.id).toLowerCase()
        const name = String(s.name || '').toLowerCase()
        const tags = (s.tags || []).join(' ').toLowerCase()
        const summary = String(s.summary || '').toLowerCase()
        let score = 0
        if (id === q) score = 100
        else if (id.startsWith(q)) score = 80
        else if (name === q) score = 70
        else if (name.includes(q)) score = 55
        else if (id.includes(q)) score = 45
        else if (tags.includes(q)) score = 30
        else if (summary.includes(q)) score = 15
        if (score > 0) scored.push({ s, score })
      }
      scored.sort((a, b) => b.score - a.score || String(a.s.id).localeCompare(String(b.s.id)))
      return {
        ok: true,
        kind,
        total: scored.length,
        items: scored.slice(0, limit).map(({ s }) => ({
          id: s.id,
          name: s.name,
          series: s.series,
          tags: s.tags || [],
          hasStill: !!s.hasStill,
        })),
      }
    }

    const list = kind === 'prompts' ? await scanPrompts() : await scanTemplates()
    const hits = list.filter((x) =>
      [x.slug, x.title, x.id, x.description, x.lang, x.framework, x.kind]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
    return { ok: true, kind, total: hits.length, items: hits.slice(0, limit) }
  }

  return {
    root,
    overview,
    getStyle,
    getStillPath,
    getPrompt,
    getTemplate,
    search,
    loadStyles,
    loadManifest,
    invalidate: () => cache.invalidate(),
  }
}
