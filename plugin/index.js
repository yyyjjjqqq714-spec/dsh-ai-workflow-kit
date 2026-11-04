import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const inject = ['webServer']

const ROOT = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit'
const STYLE_SRC = 'F:/skill提示词库/提示词等（DeepSeek可用等）/代码动画_341种风格提示词_免费/风格提示词'

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
          // 总览：风格全量索引 + 提示词/模板占位
          if (url.pathname === '/awkit/api/overview') {
            const styles = await readJson(join(ROOT, 'content/styles/_index.json'), [])
            const bySeries = {}
            for (const s of styles) {
              bySeries[s.series] = (bySeries[s.series] || 0) + 1
            }
            return sendJson(res, 200, {
              ok: true,
              styles: { total: styles.length, bySeries, items: styles },
              prompts: { total: 0, items: [] },
              templates: { total: 0, items: [] },
            })
          }

          // 单条风格详情：读原文 md
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
                ok: true,
                id: row.id,
                name: row.name,
                series: row.series,
                markdown: '',
                error: '原文读取失败: ' + String((e && e.message) || e),
              })
            }

            return sendJson(res, 200, {
              ok: true,
              id: row.id,
              name: row.name,
              series: row.series,
              seriesDir: row.seriesDir,
              hasStill: row.hasStill,
              markdown,
            })
          }

          return sendJson(res, 404, { ok: false, error: 'unknown route: ' + url.pathname })
        } catch (e) {
          return sendJson(res, 500, { ok: false, error: String((e && e.message) || e) })
        }
      },
    }),
  )
}
