/**
 * Agent 工具层：让 AI 在对话里直接检索风格库、取提示词、渲染代码模板。
 *
 * 注册形态（与宿主 ctx.tools.register 对齐）：
 *   ctx.tools.register({ name, description, parameters, output: { schema, render }, execute })
 * 返回值是卸载函数，交给 ctx.effect 管理生命周期。
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const text = (s) => [{ type: 'text', text: s }]

/** 太长的正文截断，避免一次灌爆上下文。 */
function clip(md, limit = 12_000) {
  if (!md) return ''
  return md.length > limit ? md.slice(0, limit) + `\n\n…（已截断，共 ${md.length} 字符）` : md
}

/** 模板变量替换：{{key}} 与 {{ key }} 都认。 */
export function substitute(tpl, vars) {
  return String(tpl).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (whole, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : whole,
  )
}

/**
 * @param {object} ctx cordis 上下文
 * @param {ReturnType<import('./content.js').createContentService>} content
 */
export function registerTools(ctx, content) {
  if (typeof ctx.tools?.register !== 'function') {
    ctx.logger?.info?.('[ai-workflow-kit] 宿主未提供 tools 服务，跳过 Agent 工具注册')
    return () => {}
  }

  const disposers = []

  // ---------- 检索 ----------
  disposers.push(
    ctx.tools.register({
      name: 'awkit_search',
      description:
        '在 AI 工作流资产库里检索视频风格（340 条代码动画风格）、提示词模板、代码模板。返回 id/名称/系列/标签，可继续用 awkit_get_style 取完整提示词。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '关键词，如「水墨」「A3」「CRT」「雨」' },
          kind: {
            type: 'string',
            enum: ['styles', 'prompts', 'templates'],
            description: '检索哪一类，默认 styles',
          },
          limit: { type: 'number', description: '最多返回几条，默认 20' },
        },
        required: ['query'],
      },
      output: {
        schema: { type: 'object', additionalProperties: true },
        render(_args, value) {
          if (!value || !value.items || value.items.length === 0) return text('没有匹配结果。')
          const lines = [`命中 ${value.total} 条（显示 ${value.items.length} 条）：`]
          for (const it of value.items) {
            const name = it.name || it.title || it.id || it.slug
            const meta = [it.series, it.lang, it.framework, it.kind, (it.tags || []).join('/')]
              .filter(Boolean)
              .join(' · ')
            lines.push(`- ${it.id || it.slug}  ${name}${meta ? '  (' + meta + ')' : ''}`)
          }
          return text(lines.join('\n'))
        },
      },
      async execute(args) {
        return content.search(args.query, args.kind || 'styles', args.limit || 20)
      },
    }),
  )

  // ---------- 取风格全文 ----------
  disposers.push(
    ctx.tools.register({
      name: 'awkit_get_style',
      description:
        '按 id 取一条视频风格的完整提示词原文（含画风描述与 Canvas 参考实现）。取到后可直接作为生成指令交给模型。',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: '风格 id，如 S1-A3' } },
        required: ['id'],
      },
      output: {
        schema: { type: 'object', additionalProperties: true },
        render(_args, value) {
          if (!value || !value.ok) return text('取风格失败。')
          return text(`# ${value.id} ${value.name}（${value.seriesLabel}）\n\n${clip(value.markdown)}`)
        },
      },
      async execute(args) {
        return content.getStyle(args.id)
      },
    }),
  )

  // ---------- 渲染代码模板 ----------
  disposers.push(
    ctx.tools.register({
      name: 'awkit_render_template',
      description:
        '把代码模板按变量渲染成真实源码。默认只返回文本（dryRun），传 write:true 与 targetDir 才写盘。',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '模板路径，如 typescript/fastify/route' },
          vars: { type: 'object', description: '变量键值，如 {"Resource":"Order","resource":"order","table":"orders"}' },
          targetDir: { type: 'string', description: '写盘目标目录（绝对路径）；不传则只返回内容' },
          write: { type: 'boolean', description: '是否真的写盘，默认 false' },
        },
        required: ['path'],
      },
      output: {
        schema: { type: 'object', additionalProperties: true },
        render(_args, value) {
          if (!value || !value.ok) return text('渲染失败。')
          const lines = [`模板 ${value.path} 渲染结果：`]
          for (const f of value.rendered) {
            lines.push('', `--- ${f.to}${f.written ? '（已写盘）' : ''} ---`, clip(f.content, 6000))
          }
          if (value.missing && value.missing.length) lines.push('', `未替换的占位符：${value.missing.join(', ')}`)
          return text(lines.join('\n'))
        },
      },
      async execute(args) {
        const t = await content.getTemplate(args.path)
        const vars = args.vars && typeof args.vars === 'object' ? args.vars : {}
        const rendered = []
        const missing = new Set()

        for (const f of t.files || []) {
          const content = substitute(f.content || '', vars)
          for (const m of content.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)) missing.add(m[1])
          rendered.push({ from: f.from, to: substitute(f.to, vars), content, written: false })
        }

        if (args.write === true && args.targetDir) {
          const base = resolve(String(args.targetDir))
          const { mkdir, writeFile } = await import('node:fs/promises')
          for (const f of rendered) {
            const abs = resolve(join(base, f.to))
            if (!abs.startsWith(base)) throw new Error('目标路径越界: ' + f.to)
            await mkdir(dirname(abs), { recursive: true })
            await writeFile(abs, f.content, 'utf8')
            f.written = true
          }
        }

        return { ok: true, path: t.path, rendered, missing: [...missing] }
      },
    }),
  )

  // ---------- 资产总览 ----------
  disposers.push(
    ctx.tools.register({
      name: 'awkit_overview',
      description: '列出 AI 工作流资产库的规模与分类：风格按系列统计、提示词与代码模板清单。',
      parameters: { type: 'object', properties: {} },
      output: {
        schema: { type: 'object', additionalProperties: true },
        render(_args, value) {
          if (!value) return text('读取失败。')
          const lines = [
            `风格 ${value.styles.total} 条 / 提示词 ${value.prompts.total} 个 / 代码模板 ${value.templates.total} 个`,
            '',
            '按系列：',
          ]
          for (const [k, n] of Object.entries(value.styles.bySeries || {})) {
            const label = (value.styles.series[k] || {}).label || ''
            lines.push(`- ${k} ${label}  ${n} 条`)
          }
          if (value.prompts.items?.length) {
            lines.push('', '提示词：')
            for (const p of value.prompts.items) lines.push(`- ${p.slug}/${p.version}  ${p.title}`)
          }
          if (value.templates.items?.length) {
            lines.push('', '代码模板：')
            for (const t of value.templates.items) lines.push(`- ${t.path}  ${t.title}（${t.lang}）`)
          }
          return text(lines.join('\n'))
        },
      },
      async execute() {
        return content.overview()
      },
    }),
  )

  return () => {
    for (const d of disposers) {
      try {
        if (typeof d === 'function') d()
      } catch {
        /* 卸载失败不该影响主流程 */
      }
    }
  }
}
