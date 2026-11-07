/**
 * 斜杠命令层：/awkit —— 在对话里直接查库，不必打开侧栏面板。
 *
 * 用法
 *   /awkit                 总览与帮助
 *   /awkit 水墨            关键词搜索
 *   /awkit S1-A3           按 id 精确取（支持前缀匹配）
 *   /awkit prompts         提示词清单
 *   /awkit templates       代码模板清单
 */

const text = (kind, body) => ({ kind, text: body })

export function registerCommands(ctx, content, hooks = {}) {
  const onOpenPanel = hooks.openPanel

  ctx.effect(() =>
    ctx.commands.register({
      name: 'awkit',
      description: 'AI 工作流：查视频风格库 / 提示词 / 代码模板',
      input: { hint: '关键词、风格编号（如 S1-A3），或 prompts / templates' },
      async handler(invocation) {
        const raw = String((invocation && invocation.rawInput) || '').trim()
        const q = raw.toLowerCase()

        try {
          if (!raw) return text('success', await helpText(content))
          if (q === 'prompts') return text('success', await listPrompts(content))
          if (q === 'templates') return text('success', await listTemplates(content))

          // 精确 id（字母数字数字，如 s1-a3）
          if (/^[a-z]\d+(-[a-z]\d+)?$/i.test(raw)) {
            const detail = await content.getStyle(raw.toUpperCase())
            return text(
              'success',
              [
                `## ${detail.id} ${detail.name}（${detail.seriesLabel}）`,
                detail.tags.length ? `标签：${detail.tags.join(' / ')}` : '',
                '',
                detail.markdown.slice(0, 2600) || '(正文为空)',
                detail.markdown.length > 2600 ? `\n…（共 ${detail.chars} 字符，完整内容见侧栏面板）` : '',
              ]
                .filter((l) => l !== '')
                .join('\n'),
            )
          }

          const hits = await content.search(raw, 'styles', 8)
          if (!hits.items.length) {
            return text('error', `没找到匹配「${raw}」的风格。试试 /awkit 看全部系列。`)
          }

          const lines = [`命中 ${hits.total} 条：`]
          for (const it of hits.items) lines.push(`- ${it.id}  ${it.name}  (${it.series})`)

          const first = await content.getStyle(hits.items[0].id)
          lines.push('', `=== ${first.id} ${first.name} ===`, '', first.markdown.slice(0, 2200))
          return text('success', lines.join('\n'))
        } catch (err) {
          return text('error', String((err && err.message) || err))
        }
      },
    }),
  )

  // 侧栏面板联动（宿主支持时才注册）
  if (typeof onOpenPanel === 'function') {
    ctx.effect(() =>
      ctx.commands.register({
        name: 'awkit-panel',
        description: '打开 AI 工作流侧栏面板',
        input: { hint: '可留空' },
        async handler() {
          try {
            await onOpenPanel()
            return text('success', '已切换到 AI 工作流面板。')
          } catch (err) {
            return text('error', String((err && err.message) || err))
          }
        },
      }),
    )
  }
}

async function helpText(content) {
  const o = await content.overview()
  const series = Object.entries(o.styles.bySeries || {})
    .map(([k, n]) => {
      const label = (o.styles.series[k] || {}).label || ''
      return `  ${k} ${label}  ${n} 条`
    })
    .join('\n')

  return [
    `AI 工作流 · ${o.styles.total} 条视频风格 / ${o.prompts.total} 个提示词 / ${o.templates.total} 个代码模板`,
    '',
    '按系列：',
    series,
    '',
    '用法：',
    '  /awkit 水墨        关键词搜索并给出提示词',
    '  /awkit S1-A3       按编号精确取',
    '  /awkit prompts     提示词清单',
    '  /awkit templates   代码模板清单',
    '',
    '也可以直接让我调 awkit_search / awkit_get_style / awkit_render_template。',
  ].join('\n')
}

async function listPrompts(content) {
  const o = await content.overview()
  const lines = [`提示词 ${o.prompts.total} 个：`]
  for (const p of o.prompts.items) lines.push(`- ${p.slug}/${p.version}  ${p.title}  (${p.chars} 字)`)
  return lines.join('\n')
}

async function listTemplates(content) {
  const o = await content.overview()
  const lines = [`代码模板 ${o.templates.total} 个：`]
  for (const t of o.templates.items) {
    lines.push(`- ${t.path}  ${t.title}  [${t.lang}/${t.framework}/${t.kind}]  ${t.vars} 变量 · ${t.files} 文件`)
  }
  return lines.join('\n')
}
