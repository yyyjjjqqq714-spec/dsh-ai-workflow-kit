window.__ModuleLoader__.load({
  id: '@local/ai-workflow-kit',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // ---------- 常量 ----------
    const SERIES_LABEL = {
      S1: '代码样片', S2: '现成版式', S3: '卡通画风', S4: 'Lemo·Opuscar',
      S5: '动态风格', S6: '奥斯卡98部', S7: '照参考学来的', S8: 'mg-styles-15',
      S9: 'code-video', S10: '中国风',
    }

    const SERIES_HUE = {
      S1: '#4f7cff', S2: '#8b5cf6', S3: '#f59e0b', S4: '#ec4899', S5: '#14b8a6',
      S6: '#ef4444', S7: '#84cc16', S8: '#06b6d4', S9: '#a855f7', S10: '#64748b',
    }

    const TABS = [
      { key: 'styles', label: '视频风格', dataKey: 'styles' },
      { key: 'prompts', label: '提示词', dataKey: 'prompts' },
      { key: 'templates', label: '代码模板', dataKey: 'templates' },
    ]

    const C = {
      text: 'var(--dsw-alias-label-primary, #1a1a1a)',
      sub: 'var(--dsw-alias-label-secondary, #666)',
      faint: 'var(--dsw-alias-label-tertiary, #999)',
      border: 'var(--dsw-alias-border-l1, rgba(0,0,0,.08))',
      hover: 'var(--dsw-alias-bg-hover, rgba(0,0,0,.04))',
      accent: 'var(--dsw-alias-brand-primary, #4f7cff)',
      danger: 'var(--dsw-alias-status-danger, #d4380d)',
      card: 'var(--dsw-alias-bg-layer-1, #fff)',
      layer2: 'var(--dsw-alias-bg-layer-2, rgba(0,0,0,.03))',
    }

    function KitIcon() {
      return h('svg', {
        width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
      },
        h('rect', { x: 3, y: 3, width: 18, height: 5, rx: 1.2 }),
        h('rect', { x: 3, y: 11, width: 9, height: 10, rx: 1.2 }),
        h('path', { d: 'M16 13v6' }),
        h('path', { d: 'M13 16h6' }),
      )
    }

    function useOverview() {
      const [state, setState] = React.useState({ data: null, loading: true, error: null })
      const load = React.useCallback(() => {
        setState((s) => ({ ...s, loading: true }))
        fetch('/awkit/api/overview')
          .then((r) => r.json())
          .then((d) => {
            if (d && d.ok) setState({ data: d, loading: false, error: null })
            else setState({ data: null, loading: false, error: (d && d.error) || '接口返回异常' })
          })
          .catch((e) => setState({ data: null, loading: false, error: String((e && e.message) || e) }))
      }, [])
      React.useEffect(() => { load() }, [load])
      return { ...state, reload: load }
    }

    // ---------- 基础组件 ----------
    function Chip({ children, tone }) {
      const bg = tone === 'warn' ? 'rgba(245,158,11,.12)' : C.layer2
      return h('span', {
        style: { display: 'inline-block', padding: '1px 7px', borderRadius: 10, fontSize: 11, lineHeight: '18px', background: bg, color: C.sub },
      }, children)
    }

    function Btn({ children, onClick, primary }) {
      return h('button', {
        onClick,
        style: {
          appearance: 'none',
          border: primary ? 'none' : '1px solid ' + C.border,
          background: primary ? C.accent : 'transparent',
          color: primary ? '#fff' : C.sub,
          borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12,
        },
      }, children)
    }

    function TabBar({ tabs, active, counts, onPick }) {
      return h('div', { style: { display: 'flex', gap: 4, borderBottom: '1px solid ' + C.border } },
        tabs.map((t) => h('button', {
          key: t.key,
          onClick: () => onPick(t.key),
          style: {
            appearance: 'none', border: 'none', background: 'transparent',
            padding: '8px 12px', cursor: 'pointer', fontSize: 13,
            color: active === t.key ? C.text : C.sub,
            fontWeight: active === t.key ? 600 : 400,
            borderBottom: '2px solid ' + (active === t.key ? C.accent : 'transparent'),
            marginBottom: -1,
          },
        }, t.label, h('span', { style: { marginLeft: 6, fontSize: 11, color: C.faint } },
          counts[t.key] == null ? '' : String(counts[t.key])))),
      )
    }

    function Empty({ text }) {
      return h('div', { style: { padding: '32px 0', textAlign: 'center', color: C.faint, fontSize: 13 } }, text)
    }

    // ---------- 风格卡片 ----------
    function StyleCard({ it, onOpen }) {
      const hue = SERIES_HUE[it.series] || '#888'
      const [broken, setBroken] = React.useState(false)
      const isGenerated = !it.hasStill && !!it.generated
      const showImg = (it.hasStill || it.generated) && !broken

      return h('div', {
        onClick: () => onOpen(it),
        style: {
          width: 152, cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
          border: '1px solid ' + C.border, background: C.card,
          transition: 'transform .12s ease, box-shadow .12s ease',
        },
        onMouseEnter: (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.10)' },
        onMouseLeave: (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' },
      },
        h('div', { style: { width: 152, height: 86, background: hue + '22', position: 'relative', overflow: 'hidden' } },
          showImg
            ? h('img', {
                src: '/awkit/api/still?id=' + encodeURIComponent(it.id),
                loading: 'lazy',
                onError: () => setBroken(true),
                style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
              })
            : h('div', {
                style: {
                  width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, fontWeight: 700, color: hue, opacity: 0.85,
                },
              }, String(it.name || it.id).slice(0, 1)),
          isGenerated && showImg
            ? h('span', {
                style: {
                  position: 'absolute', top: 4, right: 4, fontSize: 9, lineHeight: '14px',
                  padding: '0 4px', borderRadius: 3, background: 'rgba(0,0,0,.55)', color: '#fff',
                },
              }, '示意')
            : null,
        ),
        h('div', { style: { padding: '6px 8px 8px' } },
          h('div', { style: { fontSize: 12, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, String(it.name)),
          h('div', { style: { fontSize: 10, color: C.faint, marginTop: 2 } }, it.id),
        ),
      )
    }

    function StyleGrid({ data, query, onOpen }) {
      const items = data.styles.items || []
      const q = query.trim().toLowerCase()
      const filtered = q
        ? items.filter((it) => it.id.toLowerCase().includes(q) || String(it.name).toLowerCase().includes(q))
        : items
      if (!filtered.length) return h(Empty, { text: q ? '没有匹配的风格' : '风格索引为空' })

      const groups = []
      const idx = new Map()
      for (const it of filtered) {
        if (!idx.has(it.series)) {
          const g = { series: it.series, label: SERIES_LABEL[it.series] || it.series, items: [] }
          idx.set(it.series, g)
          groups.push(g)
        }
        idx.get(it.series).items.push(it)
      }

      return h('div', null, groups.map((g) => h(SeriesSection, { key: g.series, group: g, query: q, onOpen })))
    }

    // hooks 必须在组件顶层，不能写在 map 回调里
    function SeriesSection({ group, query, onOpen }) {
      const [expanded, setExpanded] = React.useState(false)
      const CAP = query ? 400 : (expanded ? group.items.length : 8)
      const shown = group.items.slice(0, CAP)
      const rest = group.items.length - shown.length
      return h('div', { style: { marginTop: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 } },
          h('strong', { style: { fontSize: 13, color: C.text } }, group.series),
          h('span', { style: { fontSize: 12, color: C.sub } }, group.label),
          h('span', { style: { fontSize: 11, color: C.faint } }, `· ${group.items.length} 条`),
        ),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10 } },
          shown.map((it) => h(StyleCard, { key: it.id, it, onOpen }))),
        rest > 0 ? h('div', { style: { marginTop: 8 } },
          h('button', {
            onClick: () => setExpanded(true),
            style: { appearance: 'none', border: 'none', background: 'transparent', color: C.accent, cursor: 'pointer', fontSize: 12, padding: 0 },
          }, `展开全部 ${group.items.length} 条 ↓`)) : null,
      )
    }

    // ---------- 提示词 / 模板列表 ----------
    function PromptList({ data, onOpen }) {
      const items = data.prompts.items || []
      if (!items.length) return h(Empty, { text: '暂无提示词' })
      return h('div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
        items.map((it) => h('div', {
          key: it.slug + it.version,
          onClick: () => onOpen(it),
          style: { padding: '10px 12px', borderRadius: 8, border: '1px solid ' + C.border, cursor: 'pointer', background: C.card },
          onMouseEnter: (e) => { e.currentTarget.style.background = C.hover },
          onMouseLeave: (e) => { e.currentTarget.style.background = C.card },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('strong', { style: { fontSize: 13, color: C.text } }, it.title),
            h(Chip, null, it.version),
            h('div', { style: { flex: 1 } }),
            h('span', { style: { fontSize: 11, color: C.faint } }, `${it.chars} 字`),
          ),
          it.preview ? h('div', { style: { fontSize: 12, color: C.sub, marginTop: 4, lineHeight: 1.5 } }, it.preview + '…') : null,
        )),
      )
    }

    function TemplateList({ data, onOpen }) {
      const items = data.templates.items || []
      if (!items.length) return h(Empty, { text: '暂无代码模板' })
      return h('div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
        items.map((it) => h('div', {
          key: it.id,
          onClick: () => onOpen(it),
          style: { padding: '10px 12px', borderRadius: 8, border: '1px solid ' + C.border, cursor: 'pointer', background: C.card },
          onMouseEnter: (e) => { e.currentTarget.style.background = C.hover },
          onMouseLeave: (e) => { e.currentTarget.style.background = C.card },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('strong', { style: { fontSize: 13, color: C.text } }, it.title),
            h(Chip, null, it.lang),
            h(Chip, null, it.framework),
            h(Chip, null, it.kind),
            h('div', { style: { flex: 1 } }),
            h('span', { style: { fontSize: 11, color: C.faint } }, `${it.vars} 变量 · ${it.files} 文件`),
          ),
          it.description ? h('div', { style: { fontSize: 12, color: C.sub, marginTop: 4, lineHeight: 1.5 } }, it.description) : null,
        )),
      )
    }

    // ---------- 详情 ----------
    // Electron 里 navigator.clipboard 可能因权限/上下文失败，必须有 execCommand 兜底
    function copyFallback(text) {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '-9999px'
      ta.style.left = '-9999px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      ta.setSelectionRange(0, ta.value.length)
      let ok = false
      try { ok = document.execCommand('copy') } catch (e) { ok = false }
      document.body.removeChild(ta)
      return ok ? Promise.resolve() : Promise.reject(new Error('execCommand copy failed'))
    }

    function copyText(text) {
      const val = String(text == null ? '' : text)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(val).catch(() => copyFallback(val))
      }
      return copyFallback(val)
    }

    function CopyBtn({ text, label }) {
      const [state, setState] = React.useState('idle')  // idle | done | fail
      return h('button', {
        onClick: () => {
          copyText(text)
            .then(() => {
              setState('done')
              setTimeout(() => setState('idle'), 1600)
            })
            .catch(() => {
              setState('fail')
              setTimeout(() => setState('idle'), 2200)
            })
        },
        style: {
          appearance: 'none',
          border: '1px solid ' + (state === 'done' ? 'rgba(20,184,166,.5)' : state === 'fail' ? 'rgba(212,56,13,.5)' : C.border),
          background: state === 'done' ? 'rgba(20,184,166,.12)' : state === 'fail' ? 'rgba(212,56,13,.08)' : 'transparent',
          color: state === 'done' ? '#14b8a6' : state === 'fail' ? C.danger : C.sub,
          borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12,
        },
      }, state === 'done' ? '✓ 已复制' : state === 'fail' ? '✗ 复制失败' : (label || '复制'))
    }

    function HowToUse({ id, file, series }) {
      return h('div', {
        style: { padding: '10px 12px', borderRadius: 8, background: C.layer2, marginBottom: 12, fontSize: 12, color: C.sub, lineHeight: 1.7 },
      },
        h('div', { style: { fontWeight: 600, color: C.text, marginBottom: 4 } }, '怎么调用'),
        h('div', null, '① 点下方「复制提示词」，把整段贴给模型（或本机 DSH）作为生成指令'),
        h('div', null, '② 提示词里已包含画风描述与 Canvas 参考实现，可直接生成 index.html'),
        h('div', null, '③ 想直接看源文件：', h('code', { style: { fontSize: 11 } }, file || id)),
        h('div', { style: { marginTop: 6, color: C.faint, fontSize: 11 } }, `系列：${series} · 编号：${id}`),
      )
    }

    function DetailView({ state, onBack }) {
      const { kind, row, loading, data, error } = state

      React.useEffect(() => {
        function onKey(e) {
          if (e.key === 'Escape') onBack()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onBack])

      const header = h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
        h('button', {
          onClick: onBack,
          style: { appearance: 'none', border: '1px solid ' + C.border, background: 'transparent', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: C.sub },
        }, '← 返回'),
        h('strong', { style: { fontSize: 14, color: C.text } }, row.id || row.title || row.slug),
        row.name || row.title ? h('span', { style: { fontSize: 13, color: C.sub } }, String(row.name || row.title)) : null,
        row.series ? h(Chip, null, row.series) : null,
        h('div', { style: { flex: 1 } }),
      )

      if (loading) return h('div', null, header, h(Empty, { text: '读取中…' }))
      if (error) {
        return h('div', null, header,
          h('div', { style: { padding: 12, borderRadius: 8, background: 'rgba(212,56,13,.08)', color: C.danger, fontSize: 12 } }, error))
      }

      if (kind === 'style') {
        const md = (data && data.markdown) || ''
        const stillUrl = row.hasStill ? '/awkit/api/still?id=' + encodeURIComponent(row.id) : null
        return h('div', null, header,
          h('div', { style: { display: 'flex', gap: 16, marginBottom: 12, alignItems: 'flex-start' } },
            stillUrl ? h('img', {
              src: stillUrl,
              style: { width: 240, height: 135, objectFit: 'cover', borderRadius: 8, border: '1px solid ' + C.border, flexShrink: 0 },
            }) : null,
            h('div', { style: { flex: 1 } },
              h(HowToUse, { id: row.id, file: data && data.file, series: row.series }),
              h('div', { style: { display: 'flex', gap: 8 } }, h(CopyBtn, { text: md, label: '复制提示词' })),
            ),
          ),
          md ? h('pre', {
            style: {
              margin: 0, padding: 12, borderRadius: 8, overflow: 'visible',
              background: C.layer2, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              color: C.text, fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
            },
          }, md.slice(0, 14000) + (md.length > 14000 ? `\n\n…（已截断，共 ${md.length} 字符）` : '')) : h(Empty, { text: (data && data.error) || '原文为空' }),
        )
      }

      if (kind === 'prompt') {
        const md = (data && data.markdown) || ''
        return h('div', null, header,
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 12 } },
            h(CopyBtn, { text: md, label: '复制提示词' }),
            h('span', { style: { fontSize: 12, color: C.faint, alignSelf: 'center' } }, `${md.length} 字符`),
          ),
          h('pre', {
            style: {
              margin: 0, padding: 12, borderRadius: 8, overflow: 'visible',
              background: C.layer2, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              color: C.text, fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
            },
          }, md),
        )
      }

      // 模板
      const t = (data && data.template) || {}
      const dump = JSON.stringify(t, null, 2)
      return h('div', null, header,
        h('div', { style: { display: 'flex', gap: 8, marginBottom: 12 } },
          h(Chip, null, t.lang || ''),
          h(Chip, null, t.framework || ''),
          h(Chip, null, t.kind || ''),
          h(CopyBtn, { text: dump, label: '复制 template.json' }),
        ),
        t.description ? h('div', { style: { fontSize: 12, color: C.sub, marginBottom: 10, lineHeight: 1.6 } }, t.description) : null,
        Array.isArray(t.vars) && t.vars.length ? h('div', { style: { marginBottom: 10, fontSize: 12, color: C.sub } },
          h('strong', { style: { color: C.text } }, '变量：'),
          t.vars.map((v) => h(Chip, { key: v.key }, `${v.key} (${v.type})`)),
        ) : null,
        Array.isArray(t.files) && t.files.length ? h('div', { style: { marginBottom: 10, fontSize: 12, color: C.sub } },
          h('strong', { style: { color: C.text } }, '文件映射：'),
          t.files.map((f, i) => h('div', { key: i, style: { fontFamily: 'monospace', fontSize: 11 } }, `${f.from} → ${f.to}`)),
        ) : null,
        h('pre', {
          style: { margin: 0, padding: 12, borderRadius: 8, overflow: 'visible', background: C.layer2, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: C.text, fontFamily: 'monospace' },
        }, dump),
      )
    }

    // ---------- 主面板 ----------
    function Panel() {
      const { data, loading, error, reload } = useOverview()
      const [tab, setTab] = React.useState('styles')
      const [query, setQuery] = React.useState('')
      const [detail, setDetail] = React.useState(null)

      function openStyle(row) {
        setDetail({ kind: 'style', row, loading: true })
        fetch('/awkit/api/style?id=' + encodeURIComponent(row.id))
          .then((r) => r.json())
          .then((d) => setDetail({ kind: 'style', row, loading: false, data: d, error: d && d.ok ? null : (d && d.error) }))
          .catch((e) => setDetail({ kind: 'style', row, loading: false, error: String((e && e.message) || e) }))
      }

      function openPrompt(row) {
        setDetail({ kind: 'prompt', row, loading: true })
        fetch(`/awkit/api/prompt?slug=${encodeURIComponent(row.slug)}&v=${encodeURIComponent(row.version)}`)
          .then((r) => r.json())
          .then((d) => setDetail({ kind: 'prompt', row, loading: false, data: d, error: d && d.ok ? null : (d && d.error) }))
          .catch((e) => setDetail({ kind: 'prompt', row, loading: false, error: String((e && e.message) || e) }))
      }

      function openTemplate(row) {
        setDetail({ kind: 'template', row, loading: true })
        fetch('/awkit/api/template?path=' + encodeURIComponent(row.path))
          .then((r) => r.json())
          .then((d) => setDetail({ kind: 'template', row, loading: false, data: d, error: d && d.ok ? null : (d && d.error) }))
          .catch((e) => setDetail({ kind: 'template', row, loading: false, error: String((e && e.message) || e) }))
      }

      if (detail) return h('div', { style: { height: '100%', boxSizing: 'border-box', overflowY: 'auto', overflowX: 'hidden', padding: '16px 20px 40px' } }, h(DetailView, { state: detail, onBack: () => setDetail(null) }))

      const counts = {
        styles: data ? data.styles.total : null,
        prompts: data ? data.prompts.total : null,
        templates: data ? data.templates.total : null,
      }

      return h('div', { style: { height: '100%', boxSizing: 'border-box', overflowY: 'auto', overflowX: 'hidden', padding: '16px 20px 40px', color: C.text } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
          h('h2', { style: { fontSize: 16, fontWeight: 600, margin: 0 } }, 'AI 工作流'),
          h('span', { style: { fontSize: 11, color: C.faint } }, '真数据版'),
          h('div', { style: { flex: 1 } }),
          h(Btn, { onClick: reload }, loading ? '刷新中…' : '刷新'),
        ),
        error ? h('div', { style: { padding: '8px 12px', marginBottom: 10, borderRadius: 8, background: 'rgba(212,56,13,.08)', color: C.danger, fontSize: 12 } }, '接口未接通：' + error) : null,
        h('div', {
          style: {
            position: 'sticky', top: 0, zIndex: 2,
            background: 'var(--dsw-alias-bg-layer-1, #ffffff)',
            paddingTop: 2,
          },
        },
          h(TabBar, { tabs: TABS, active: tab, counts, onPick: (k) => { setTab(k); setQuery(''); setDetail(null) } }),
          tab === 'styles' ? h('input', {
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: '搜索 id 或名称，如 A3 / 水墨',
            style: { width: '100%', boxSizing: 'border-box', marginTop: 10, padding: '6px 10px', fontSize: 12, borderRadius: 6, outline: 'none', border: '1px solid ' + C.border, background: C.card, color: C.text },
          }) : null,
        ),
        h('div', { style: { marginTop: 10 } },
          tab === 'styles'
            ? (data ? h(StyleGrid, { data, query, onOpen: openStyle }) : h(Empty, { text: loading ? '加载中…' : '暂无数据' }))
            : tab === 'prompts'
              ? (data ? h(PromptList, { data, onOpen: openPrompt }) : h(Empty, { text: loading ? '加载中…' : '暂无数据' }))
              : (data ? h(TemplateList, { data, onOpen: openTemplate }) : h(Empty, { text: loading ? '加载中…' : '暂无数据' })),
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: 'awkit', order: 200, label: () => 'AI 工作流' }, KitIcon),
        )
        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: 'awkit' }, Panel),
        )
      },
    }
  },
})
