/**
 * HTTP 路由层：把内容层暴露成同源 REST API 给 client 半用。
 *
 * 兼容策略：0.1.0 的老路由（?id= 查询串）与 0.2 的新路由（/styles/:id）同时支持，
 * 老版本 client.js 在插件升级后不会立刻 404。
 */
import { readFile } from 'node:fs/promises'
import { ContentError } from './content.js'

const KNOWN_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

function sendJson(res, status, payload, cors) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    ...(cors ? KNOWN_CORS : null),
  })
  res.end(body)
}

async function sendImage(res, absPath, cacheSeconds, cors) {
  let buf
  try {
    buf = await readFile(absPath)
  } catch {
    return false
  }
  res.writeHead(200, {
    'content-type': 'image/jpeg',
    'content-length': buf.length,
    'cache-control': 'public, max-age=' + cacheSeconds,
    ...(cors ? KNOWN_CORS : null),
  })
  res.end(buf)
  return true
}

const NUM = (v, fallback) => {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * @param {object} deps
 * @param {ReturnType<import('./content.js').createContentService>} deps.content
 * @param {{ allowCors?: boolean, cacheSeconds?: number, maxPromptChars?: number }} deps.options
 */
export function createHandler({ content, options = {} }) {
  const allowCors = options.allowCors !== false
  const cacheSeconds = NUM(options.cacheSeconds, 86400)
  const maxPromptChars = NUM(options.maxPromptChars, 200_000)

  return async function handle(req, res) {
    let url
    try {
      url = new URL(req.url, 'http://127.0.0.1')
    } catch {
      return sendJson(res, 400, { ok: false, error: 'bad url' }, allowCors)
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, KNOWN_CORS)
      return res.end()
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { ok: false, error: 'method not allowed' }, allowCors)
    }

    const path = url.pathname.replace(/^\/awkit\/api/, '').replace(/\/+$/, '') || '/'

    try {
      switch (true) {
        // ---------- 总览 ----------
        case path === '/overview' || path === '/':
          return sendJson(res, 200, await content.overview(), allowCors)

        // ---------- 健康检查 ----------
        case path === '/health': {
          const m = await content.loadManifest().catch(() => null)
          return sendJson(
            res,
            200,
            { ok: true, contentRoot: content.root, contentVersion: m && m.contentVersion, counts: m && m.counts },
            allowCors,
          )
        }

        // ---------- 搜索 ----------
        case path === '/search': {
          const q = url.searchParams.get('q') || ''
          const kind = url.searchParams.get('kind') || 'styles'
          const limit = NUM(url.searchParams.get('limit'), 30)
          return sendJson(res, 200, await content.search(q, kind, limit), allowCors)
        }

        // ---------- 风格详情（新旧两种） ----------
        case path === '/style' || path.startsWith('/styles/'): {
          const id =
            url.searchParams.get('id') ||
            (path.startsWith('/styles/') ? decodeURIComponent(path.slice('/styles/'.length)) : null)
          const data = await content.getStyle(id)
          if (data.chars > maxPromptChars) {
            data.markdown = data.markdown.slice(0, maxPromptChars)
            data.truncated = true
          }
          return sendJson(res, 200, data, allowCors)
        }

        // ---------- 缩略图（新旧两种） ----------
        case path === '/still' || path.startsWith('/stills/'): {
          const id =
            url.searchParams.get('id') ||
            (path.startsWith('/stills/') ? decodeURIComponent(path.slice('/stills/'.length)) : null)
          if (!id) return sendJson(res, 400, { ok: false, error: 'missing id' }, allowCors)
          const abs = await content.getStillPath(id)
          if (!abs) return sendJson(res, 404, { ok: false, error: 'no still for ' + id }, allowCors)
          const sent = await sendImage(res, abs, cacheSeconds, allowCors)
          if (!sent) return sendJson(res, 404, { ok: false, error: 'still unreadable' }, allowCors)
          return
        }

        // ---------- 提示词（新旧两种） ----------
        case path === '/prompt' || path.startsWith('/prompts/'): {
          let slug = url.searchParams.get('slug')
          let version = url.searchParams.get('v')
          if (path.startsWith('/prompts/')) {
            const rest = path.slice('/prompts/'.length).split('/')
            slug = decodeURIComponent(rest[0] || '')
            version = decodeURIComponent(rest[1] || version || '')
          }
          return sendJson(res, 200, await content.getPrompt(slug, version), allowCors)
        }

        // ---------- 模板 ----------
        case path === '/template' || path.startsWith('/templates/'): {
          const p =
            url.searchParams.get('path') ||
            (path.startsWith('/templates/') ? decodeURIComponent(path.slice('/templates/'.length)) : null)
          return sendJson(res, 200, await content.getTemplate(p), allowCors)
        }

        default:
          return sendJson(res, 404, { ok: false, error: 'unknown route: ' + path }, allowCors)
      }
    } catch (err) {
      if (err instanceof ContentError) {
        return sendJson(res, err.status, { ok: false, code: err.code, error: err.message }, allowCors)
      }
      return sendJson(
        res,
        500,
        { ok: false, error: String((err && err.message) || err) },
        allowCors,
      )
    }
  }
}
