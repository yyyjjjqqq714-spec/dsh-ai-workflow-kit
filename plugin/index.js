import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'

export const inject = ['webServer', 'commands']

const ROOT = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit'
const STYLE_SRC = 'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词'
const GEN_DIR = join(ROOT, 'content/styles/_generated')

async function readJson(p, fallback) {
  try {
    return JSON.parse(await readFile(p, 'utf8'))
  } catch {
    return fallback
  }
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}

// 从 markdown 第一行标题提取名字
function firstHeading(md, fallback) {
  const line = md.split(/\r?\n/).find((l) => l.trim().startsWith('#'))
  if (!line) return fallback
  return line.replace(/^#+\s*/, '').trim() || fallback
}

// 扫描 content/prompts/<slug>/v*.md
async function scanPrompts() {
  const base = join(ROOT, 'content/prompts')
  const out = []
  let dirs = []
  try {
    dirs = await readdir(base, { withFileTypes: true })
  } catch {
    return out
  }
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    const slug = d.name
    const dir = join(base, slug)
    let files = []
    try {
      files = (await readdir(dir)).filter((f) => /^v\d+.*\.md$/i.test(f))
    } catch {
      continue
    }
    for (const f of files) {
      const full = join(dir, f)
      const md = await readFile(full, 'utf8')
      out.push({
        slug,
        version: f.replace(/\.md$/i, ''),
        title: firstHeading(md, slug),
        file: relative(base, full).replace(/\\/g, '/'),
        chars: md.length,
        preview: md.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#')).slice(0, 2).join(' ').slice(0, 120),
      })
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}

// 扫描 content/templates/**/template.json
async function scanTemplates() {
  const base = join(ROOT, 'content/templates')
  const out = []

  async function walk(dir) {
    let entries = []
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
        const j = await readJson(full, null)
        if (!j) continue
        out.push({
          id: j.id || relative(base, dir).replace(/\\/g, '/'),
          title: j.title || j.id,
          description: j.description || '',
          lang: j.lang || '',
          framework: j.framework || '',
          kind: j.kind || '',
          vars: Array.isArray(j.vars) ? j.vars.length : 0,
          files: Array.isArray(j.files) ? j.files.length : 0,
          path: relative(base, dir).replace(/\\/g, '/'),
        })
      }
    }
  }

  await walk(base)
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

export function apply(ctx) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: '/awkit/api',
      handler: async (req, res) => {
        let url
        try {
          url = new URL(req.url, 'http://localhost')
        } catch {
          return sendJson(res, 400, { ok: false, error: 'bad url' })
        }

        try {
          // 总览
          if (url.pathname === '/awkit/api/overview') {
            const styles = await readJson(join(ROOT, 'content/styles/_index.json'), [])
            const bySeries = {}
            for (const s of styles) {
              bySeries[s.series] = (bySeries[s.series] || 0) + 1
              // 无原图时回退到程序化示意卡
              if (!s.hasStill) {
                s.generated = existsSync(join(GEN_DIR, s.id + '.jpg'))
              }
            }
            const prompts = await scanPrompts()
            const templates = await scanTemplates()
            return sendJson(res, 200, {
              ok: true,
              styles: { total: styles.length, bySeries, items: styles },
              prompts: { total: prompts.length, items: prompts },
              templates: { total: templates.length, items: templates },
            })
          }

          // 风格详情
          if (url.pathname === '/awkit/api/style') {
            const id = url.searchParams.get('id')
            if (!id) return sendJson(res, 400, { ok: false, error: 'missing id' })
            const styles = await readJson(join(ROOT, 'content/styles/_index.json'), [])
            const row = styles.find((s) => s.id === id)
            if (!row) return sendJson(res, 404, { ok: false, error: 'style not found: ' + id })
            let markdown = ''
            try {
              markdown = await readFile(join(STYLE_SRC, row.file), 'utf8')
            } catch (e) {
              return sendJson(res, 200, {
                ok: true, id: row.id, name: row.name, series: row.series,
                markdown: '', error: '原文读取失败: ' + String((e && e.message) || e),
              })
            }
            return sendJson(res, 200, {
              ok: true, id: row.id, name: row.name, series: row.series,
              seriesDir: row.seriesDir, hasStill: row.hasStill, file: row.file, markdown,
            })
          }

          // 缩略图：原图优先，无原图回退到程序化示意卡
          if (url.pathname === '/awkit/api/still') {
            const id = url.searchParams.get('id')
            if (!id) return sendJson(res, 400, { ok: false, error: 'missing id' })
            const styles = await readJson(join(ROOT, 'content/styles/_index.json'), [])
            const row = styles.find((s) => s.id === id)
            if (!row) return sendJson(res, 404, { ok: false, error: 'not found' })

            const candidates = []
            if (row.hasStill) candidates.push({ path: join(STYLE_SRC, row.file.replace(/\.md$/i, '.jpg')), kind: 'original' })
            candidates.push({ path: join(GEN_DIR, row.id + '.jpg'), kind: 'generated' })

            for (const c of candidates) {
              try {
                const buf = await readFile(c.path)
                res.writeHead(200, {
                  'content-type': 'image/jpeg',
                  'content-length': buf.length,
                  'cache-control': 'public, max-age=86400',
                  'x-still-kind': c.kind,
                })
                return res.end(buf)
              } catch {
                // 试下一个
              }
            }
            return sendJson(res, 404, { ok: false, error: 'no still for ' + id })
          }

          // 提示词原文
          if (url.pathname === '/awkit/api/prompt') {
            const slug = url.searchParams.get('slug')
            const version = url.searchParams.get('v')
            if (!slug || !version) return sendJson(res, 400, { ok: false, error: 'missing slug/version' })
            try {
              const md = await readFile(join(ROOT, 'content/prompts', slug, version + '.md'), 'utf8')
              return sendJson(res, 200, { ok: true, slug, version, markdown: md })
            } catch (e) {
              return sendJson(res, 404, { ok: false, error: String((e && e.message) || e) })
            }
          }

          // 模板详情
          if (url.pathname === '/awkit/api/template') {
            const path = url.searchParams.get('path')
            if (!path) return sendJson(res, 400, { ok: false, error: 'missing path' })
            if (path.includes('..')) return sendJson(res, 400, { ok: false, error: 'bad path' })
            try {
              const j = await readJson(join(ROOT, 'content/templates', path, 'template.json'), null)
              if (!j) return sendJson(res, 404, { ok: false, error: 'template not found' })
              return sendJson(res, 200, { ok: true, path, template: j })
            } catch (e) {
              return sendJson(res, 404, { ok: false, error: String((e && e.message) || e) })
            }
          }

          return sendJson(res, 404, { ok: false, error: 'unknown route: ' + url.pathname })
        } catch (e) {
          return sendJson(res, 500, { ok: false, error: String((e && e.message) || e) })
        }
      },
    }),
  )

  // 斜杠命令：随时在对话里调用
  ctx.commands.register({
    name: 'awkit',
    description: 'AI 工作流：查视频风格库 / 提示词 / 代码模板',
    input: { hint: '关键词或风格编号，如 水墨 / A3' },
    async handler(invocation) {
      const q = String((invocation && invocation.rawInput) || '').trim()
      const styles = await readJson(join(ROOT, 'content/styles/_index.json'), [])

      if (!q) {
        const bySeries = {}
        for (const s of styles) bySeries[s.series] = (bySeries[s.series] || 0) + 1
        const prompts = await scanPrompts()
        const templates = await scanTemplates()
        return {
          kind: 'success',
          text: [
            `AI 工作流 · ${styles.length} 条视频风格 / ${prompts.length} 个提示词 / ${templates.length} 个模板`,
            '',
            '按系列：',
            ...Object.entries(bySeries).map(([k, v]) => `- ${k}  ${v} 条`),
            '',
            '用法：',
            '  /awkit 水墨    搜索并给出提示词',
            '  /awkit A3      按编号查',
          ].join('\n'),
        }
      }

      const ql = q.toLowerCase()
      const hits = styles.filter(
        (s) => s.id.toLowerCase().includes(ql) || String(s.name).toLowerCase().includes(ql),
      )
      if (!hits.length) {
        return { kind: 'error', text: `没找到匹配「${q}」的风格。试试 /awkit 看全部系列。` }
      }

      const first = hits[0]
      let md = ''
      try {
        md = await readFile(join(STYLE_SRC, first.file), 'utf8')
      } catch (e) {
        md = '(原文读取失败: ' + String((e && e.message) || e) + ')'
      }

      return {
        kind: 'success',
        text: [
          `命中 ${hits.length} 条${hits.length > 1 ? '（列前 8）' : ''}：`,
          ...hits.slice(0, 8).map((h) => `- ${h.id}  ${h.name}`),
          '',
          `=== ${first.id} ${first.name} ===`,
          '',
          md.slice(0, 2400),
        ].join('\n'),
      }
    },
  })
}
