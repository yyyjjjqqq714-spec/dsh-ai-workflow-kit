#!/usr/bin/env node
/**
 * Host 半冒烟测试：不装 DSH，直接验证内容层与路由层。
 *
 * 用法：node tools/smoke.mjs
 */
import { createServer } from 'node:http'
import { createContentService } from '../lib/content.js'
import { createHandler } from '../lib/routes.js'

let failed = 0
function check(name, cond, extra = '') {
  if (cond) {
    console.log(`  ok   ${name}`)
  } else {
    failed++
    console.log(`  FAIL ${name} ${extra}`)
  }
}

const content = createContentService()
const handler = createHandler({ content, options: {} })

const server = createServer(handler)
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

async function get(path) {
  const res = await fetch(base + path)
  const ct = res.headers.get('content-type') || ''
  const body = ct.includes('json') ? await res.json() : await res.arrayBuffer()
  return { status: res.status, body, ct }
}

console.log('\n[内容层]')
const ov = await content.overview()
check('overview.styles.total = 340', ov.styles.total === 340, `got ${ov.styles.total}`)
check('overview.prompts.total = 8', ov.prompts.total === 8, `got ${ov.prompts.total}`)
check('overview.templates.total = 5', ov.templates.total === 5, `got ${ov.templates.total}`)
check('manifest contentVersion present', !!ov.contentVersion, String(ov.contentVersion))

const st = await content.getStyle('S1-A3')
check('getStyle S1-A3 有正文', st.chars > 100, `chars=${st.chars}`)
check('getStyle 名称是大字冲击', st.name === '大字冲击', st.name)
check('getStyle 有标签', Array.isArray(st.tags) && st.tags.length > 0)

const still = await content.getStillPath('S1-A3')
check('S1-A3 缩略图存在', !!still, String(still))

const s = await content.search('水墨')
check('搜索「水墨」有结果', s.total > 0, `total=${s.total}`)
const s2 = await content.search('S1-A3')
check('搜索 id 精确命中排第一', s2.items[0] && s2.items[0].id === 'S1-A3', JSON.stringify(s2.items[0]))

const pr = await content.getPrompt('mv-storyboard', 'v1')
check('getPrompt mv-storyboard/v1', pr.chars > 100, `chars=${pr.chars}`)

const tp = await content.getTemplate('typescript/fastify/route')
check('getTemplate fastify route', tp.template.id === 'ts-fastify-route', tp.template.id)
check('getTemplate 带文件内容', tp.files.length === 1 && tp.files[0].content.length > 50)

// 安全边界
let blocked = false
try {
  await content.getTemplate('../../../etc')
} catch {
  blocked = true
}
check('路径穿越被拒', blocked)

console.log('\n[路由层]')
const r1 = await get('/awkit/api/overview')
check('GET /overview 200', r1.status === 200 && r1.body.ok === true)

const r2 = await get('/awkit/api/styles/S1-A3')
check('GET /styles/S1-A3 200', r2.status === 200 && r2.body.id === 'S1-A3')

const r3 = await get('/awkit/api/style?id=S1-A3')
check('旧路由 /style?id= 兼容', r3.status === 200 && r3.body.id === 'S1-A3')

const r4 = await get('/awkit/api/stills/S1-A3')
check('GET /stills/S1-A3 返回图片', r4.status === 200 && r4.ct.includes('image/jpeg'))

const r5 = await get('/awkit/api/search?q=%E6%B0%B4%E5%A2%A8')
check('GET /search 有水墨结果', r5.status === 200 && r5.body.total > 0)

const r6 = await get('/awkit/api/styles/NOPE')
check('不存在的 id 返回 404', r6.status === 404 && r6.body.code === 'STYLE_NOT_FOUND', `status=${r6.status}`)

const r7 = await get('/awkit/api/health')
check('GET /health 200', r7.status === 200 && r7.body.ok === true)

server.close()
console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
