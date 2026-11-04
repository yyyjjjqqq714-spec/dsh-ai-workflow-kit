window.__ModuleLoader__.load({
  id: '@local/ai-workflow-kit',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // ---------- 常量 ----------
    const SERIES_LABEL = {
      S1: '代码样片',
      S2: '现成版式',
      S3: '卡通画风',
      S4: 'Lemo·Opuscar',
      S5: '动态风格',
      S6: '奥斯卡98部',
      S7: '照参考学来的',
      S8: 'mg-styles-15',
      S9: 'code-video',
      S10: '中国风',
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
    }

    // ---------- 图标 ----------
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

    // ---------- 数据 ----------
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

    // ---------- 小组件 ----------
    function Chip({ children, tone }) {
      const bg = tone === 'warn'
        ? 'var(--dsw-alias-status-warning-bg, #fff7e6)'
        : 'var(--dsw-alias-bg-layer-2, rgba(0,0,0,.04))'
      return h('span', {
        style: {
          display: 'inline-block', padding: '1px 7px', borderRadius: 10,
          fontSize: 11, lineHeight: '18px', background: bg, color: C.sub,
        },
      }, children)
    }

    function TabBar({ tabs, active, counts, onPick }) {
      return h('div', {
        style: { display: 'flex', gap: 4, borderBottom: '1px solid ' + C.border, marginBottom: 0 },
      }, tabs.map((t) =>
        h('button', {
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
        },
          t.label,
          h('span', { style: { marginLeft: 6, fontSize: 11, color: C.faint } },
            String(counts[t.key] == null ? '' : counts[t.key])),
        ),
      ))
    }

    function Empty({ text }) {
      return h('div', { style: { padding: '28px 0', textAlign: 'center', color: C.faint, fontSize: 13 } }, text)
    }

    function StyleList({ data, query, onOpen }) {
      const items = data.styles.items || []
      const q = query.trim().toLowerCase()

      const filtered = q
        ? items.filter((it) =>
            it.id.toLowerCase().includes(q) || String(it.name).toLowerCase().includes(q))
        : items

      if (!filtered.length) return h(Empty, { text: q ? '没有匹配的风格' : '风格索引为空' })

      // 按系列分组
      const groups = []
      const index = new Map()
      for (const it of filtered) {
        if (!index.has(it.series)) {
          const g = { series: it.series, label: SERIES_LABEL[it.series] || it.series, items: [] }
          index.set(it.series, g)
          groups.push(g)
        }
        index.get(it.series).items.push(it)
      }

      const CAP = q ? 200 : 8

      return h('div', null, groups.map((g) => {
        const shown = g.items.slice(0, CAP)
        const rest = g.items.length - shown.length
        return h('div', { key: g.series, style: { marginTop: 14 } },
          h('div', {
            style: {
              display: 'flex', alignItems: 'baseline', gap: 8,
              fontSize: 12, color: C.sub, marginBottom: 4,
            },
          },
            h('strong', { style: { color: C.text, fontSize: 12 } }, g.series),
            h('span', null, g.label),
            h('span', { style: { color: C.faint } }, `· ${g.items.length} 条`),
          ),
          shown.map((it) =>
            h('div', {
              key: it.id,
              onClick: () => onOpen(it),
              style: {
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                borderBottom: '1px solid ' + C.border,
              },
              onMouseEnter: (e) => { e.currentTarget.style.background = C.hover },
              onMouseLeave: (e) => { e.currentTarget.style.background = 'transparent' },
            },
              h('code', {
                style: { fontSize: 11, color: C.faint, minWidth: 62 },
              }, it.id),
              h('span', { style: { fontSize: 13, color: C.text, flex: 1 } }, String(it.name)),
              it.hasStill ? h(Chip, null, '有样图') : null,
            ),
          ),
          rest > 0 ? h('div', {
            style: { fontSize: 11, color: C.faint, padding: '4px 8px' },
          }, `… 还有 ${rest} 条（用搜索框过滤）`) : null,
        )
      }))
    }

    function PlaceholderList({ label }) {
      return h(Empty, {
        text: `${label}还没有内容 — 明天 MVP 阶段按批次补进来`,
      })
    }

    function DetailView({ state, onBack }) {
      const { row, loading, data, error } = state

      const header = h('div', {
        style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
      },
        h('button', {
          onClick: onBack,
          style: {
            appearance: 'none', border: '1px solid ' + C.border, background: 'transparent',
            borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: C.sub,
          },
        }, '← 返回'),
        h('strong', { style: { fontSize: 14, color: C.text } }, row.id),
        h('span', { style: { fontSize: 13, color: C.sub } }, String(row.name)),
        h(Chip, null, row.series),
      )

      if (loading) return h('div', null, header, h(Empty, { text: '读取原文…' }))

      if (error) {
        return h('div', null, header,
          h('div', {
            style: { padding: 12, borderRadius: 8, background: 'rgba(212,56,13,.08)', color: C.danger, fontSize: 12 },
          }, error))
      }

      const md = (data && data.markdown) || ''
      if (!md) return h('div', null, header, h(Empty, { text: (data && data.error) || '原文为空' }))

      return h('div', null, header,
        h('pre', {
          style: {
            margin: 0, padding: 12, borderRadius: 8, overflow: 'auto',
            maxHeight: 'calc(100vh - 240px)',
            background: 'var(--dsw-alias-bg-layer-2, rgba(0,0,0,.03))',
            fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            color: C.text, fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
          },
        }, md.slice(0, 12000) + (md.length > 12000 ? '\n\n…（已截断，共 ' + md.length + ' 字符）' : '')),
      )
    }

    // ---------- 主面板 ----------
    function Panel() {
      const { data, loading, error, reload } = useOverview()
      const [tab, setTab] = React.useState('styles')
      const [query, setQuery] = React.useState('')
      const [detail, setDetail] = React.useState(null)

      function openDetail(row) {
        setDetail({ row, loading: true })
        fetch('/awkit/api/style?id=' + encodeURIComponent(row.id))
          .then((r) => r.json())
          .then((d) => setDetail({ row, loading: false, data: d, error: d && d.ok ? null : (d && d.error) }))
          .catch((e) => setDetail({ row, loading: false, error: String((e && e.message) || e) }))
      }

      if (detail) {
        return h('div', { style: { padding: '16px 20px' } }, h(DetailView, { state: detail, onBack: () => setDetail(null) }))
      }

      const counts = {
        styles: data ? data.styles.total : null,
        prompts: data ? data.prompts.total : null,
        templates: data ? data.templates.total : null,
      }

      return h('div', { style: { padding: '16px 20px', color: C.text } },
        // 头部
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
          h('h2', { style: { fontSize: 16, fontWeight: 600, margin: 0 } }, 'AI 工作流'),
          h('span', { style: { fontSize: 11, color: C.faint } }, '真数据版'),
          h('div', { style: { flex: 1 } }),
          h('button', {
            onClick: reload,
            style: {
              appearance: 'none', border: '1px solid ' + C.border, background: 'transparent',
              borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: C.sub,
            },
          }, loading ? '刷新中…' : '刷新'),
        ),

        // 错误条
        error ? h('div', {
          style: {
            padding: '8px 12px', marginBottom: 10, borderRadius: 8,
            background: 'rgba(212,56,13,.08)', color: C.danger, fontSize: 12,
          },
        }, '接口未接通：' + error + '（Host 半可能需重启生效）') : null,

        // Tab
        h(TabBar, { tabs: TABS, active: tab, counts, onPick: (k) => { setTab(k); setDetail(null) } }),

        // 内容
        h('div', { style: { marginTop: 10 } },
          tab === 'styles' ? h('div', null,
            h('input', {
              value: query,
              onChange: (e) => setQuery(e.target.value),
              placeholder: '搜索 id 或名称，如 A3 / 水墨',
              style: {
                width: '100%', boxSizing: 'border-box', padding: '6px 10px',
                fontSize: 12, borderRadius: 6, outline: 'none',
                border: '1px solid ' + C.border, background: C.card, color: C.text,
              },
            }),
            data ? h(StyleList, { data, query, onOpen: openDetail }) : h(Empty, { text: loading ? '加载中…' : '暂无数据' }),
          ) : tab === 'prompts'
            ? h(PlaceholderList, { label: '提示词' })
            : h(PlaceholderList, { label: '代码模板' }),
        ),
      )
    }

    // ---------- 注册 ----------
    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: 'awkit', order: 200, label: () => 'AI 工作流' },
            KitIcon,
          ),
        )
        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: 'awkit' }, Panel),
        )
      },
    }
  },
})
