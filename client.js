/**
 * AI Workflow Kit —— 浏览器半。
 *
 * 分区：主题令牌 → 基础控件 → 数据 hooks → 剪贴板 → 三个 Tab → 详情 → 主面板 → 注册
 *
 * 约束（来自 DSH 插件规范）
 * - 模块格式固定：window.__ModuleLoader__.load({ id, factory })
 * - 不 require @deepseek-ai/dsh-client-ui-primitives（跨版本不稳），控件自写
 * - 颜色只走 --dsw-alias-* 设计令牌，跟随主题亮暗
 * - 图片缓存键用内容版本号，而非 Date.now()，这样内容不变时浏览器能真正命中缓存
 */
window.__ModuleLoader__.load({
  id: 'dsh-ai-workflow-kit',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // =====================================================================
    // 1. 常量与主题令牌
    // =====================================================================
    const SERIES_LABEL = {
      S1: '代码样片', S2: '现成版式', S3: '卡通画风', S4: 'Lemo·Opuscar',
      S5: '动态风格', S6: '奥斯卡 98 部', S7: '照参考学来的', S8: 'mg-styles-15',
      S9: 'code-video', S10: '中国风',
    }
    const SERIES_HUE = {
      S1: '#4f7cff', S2: '#8b5cf6', S3: '#f59e0b', S4: '#ec4899', S5: '#14b8a6',
      S6: '#ef4444', S7: '#84cc16', S8: '#06b6d4', S9: '#a855f7', S10: '#64748b',
    }
    const TABS = [
      { key: 'styles', label: '视频风格' },
      { key: 'prompts', label: '提示词' },
      { key: 'templates', label: '代码模板' },
    ]
    const PLATFORMS = [
      { id: 'douyin', label: '抖音 9:16' },
      { id: 'bilibili', label: 'B站 16:9' },
      { id: 'wechat', label: '视频号 9:16' },
      { id: 'youtube', label: 'YouTube 16:9' },
    ]
    const LS_KEY = 'awkit:prefs:v2'

    const C = {
      text: 'var(--dsw-alias-label-primary, #1a1a1a)',
      sub: 'var(--dsw-alias-label-secondary, #666)',
      faint: 'var(--dsw-alias-label-tertiary, #999)',
      border: 'var(--dsw-alias-border-l1, rgba(0,0,0,.08))',
      border2: 'var(--dsw-alias-border-l2, rgba(0,0,0,.14))',
      hover: 'var(--dsw-alias-bg-hover, rgba(0,0,0,.04))',
      accent: 'var(--dsw-alias-brand-primary, #4f7cff)',
      danger: 'var(--dsw-alias-status-danger, #d4380d)',
      ok: '#14b8a6',
      card: 'var(--dsw-alias-bg-layer-1, #fff)',
      layer2: 'var(--dsw-alias-bg-layer-2, rgba(0,0,0,.03))',
      layer3: 'var(--dsw-alias-bg-layer-3, rgba(0,0,0,.06))',
    }
    const MONO = 'ui-monospace, SFMono-Regular, Consolas, monospace'

    // =====================================================================
    // 2. 偏好设置（只放 UI 偏好，符合 DSH 对 localStorage 的定位）
    // =====================================================================
    function loadPrefs() {
      try {
        return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}
      } catch {
        return {}
      }
    }
    function savePrefs(p) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(p))
      } catch {
        /* 隐私模式等场景忽略 */
      }
    }

    // =====================================================================
    // 3. 数据 hooks
    // =====================================================================
    function useJson(url) {
      const [state, setState] = React.useState({ data: null, loading: true, error: null })
      const [nonce, setNonce] = React.useState(0)
      React.useEffect(() => {
        if (!url) return
        let alive = true
        setState((s) => ({ ...s, loading: true }))
        fetch(url)
          .then((r) => r.json())
          .then((d) => {
            if (!alive) return
            if (d && d.ok) setState({ data: d, loading: false, error: null })
            else setState({ data: null, loading: false, error: (d && d.error) || '接口返回异常' })
          })
          .catch((e) => {
            if (!alive) return
            setState({ data: null, loading: false, error: String((e && e.message) || e) })
          })
        return () => { alive = false }
      }, [url, nonce])
      return [state, () => setNonce((n) => n + 1)]
    }

    // =====================================================================
    // 4. 基础控件
    // =====================================================================
    function Chip({ children, tone }) {
      const bg =
        tone === 'warn' ? 'rgba(245,158,11,.14)' :
        tone === 'ok' ? 'rgba(20,184,166,.14)' :
        tone === 'accent' ? 'rgba(79,124,255,.12)' : C.layer2
      const color =
        tone === 'warn' ? '#b45309' :
        tone === 'ok' ? '#0f766e' :
        tone === 'accent' ? C.accent : C.sub
      return h('span', {
        style: {
          display: 'inline-block', padding: '1px 7px', borderRadius: 10,
          fontSize: 11, lineHeight: '18px', background: bg, color,
        },
      }, children)
    }

    function Btn({ children, onClick, primary, disabled, title }) {
      const [hover, setHover] = React.useState(false)
      return h('button', {
        onClick,
        disabled,
        title,
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        style: {
          appearance: 'none',
          border: primary ? 'none' : '1px solid ' + (hover ? C.border2 : C.border),
          background: primary ? C.accent : (hover ? C.hover : 'transparent'),
          color: primary ? '#fff' : C.sub,
          borderRadius: 6, padding: '4px 12px', fontSize: 12,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'background .12s ease, border-color .12s ease',
        },
      }, children)
    }

    function Spinner({ size = 14 }) {
      return h('span', {
        style: {
          display: 'inline-block', width: size, height: size, borderRadius: '50%',
          border: '2px solid ' + C.border2, borderTopColor: C.accent,
          animation: 'awkit-spin .7s linear infinite',
        },
      })
    }

    function Empty({ text, action }) {
      return h('div', {
        style: { padding: '36px 0', textAlign: 'center', color: C.faint, fontSize: 13 },
      }, h('div', null, text), action ? h('div', { style: { marginTop: 10 } }, action) : null)
    }

    function Skeleton({ rows = 6 }) {
      return h('div', { style: { marginTop: 12 } },
        Array.from({ length: rows }).map((_, i) =>
          h('div', {
            key: i,
            style: {
              height: 44, borderRadius: 8, marginBottom: 8,
              background: C.layer2,
              animation: 'awkit-pulse 1.4s ease-in-out infinite',
              animationDelay: (i * 60) + 'ms',
            },
          }),
        ),
      )
    }

    function TabBar({ tabs, active, counts, onPick }) {
      return h('div', { style: { display: 'flex', gap: 2, borderBottom: '1px solid ' + C.border } },
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

    // =====================================================================
    // 5. 剪贴板（Electron 里 navigator.clipboard 可能失败，必须有兜底）
    // =====================================================================
    function copyFallback(text) {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '-9999px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      ta.setSelectionRange(0, ta.value.length)
      let ok = false
      try { ok = document.execCommand('copy') } catch { ok = false }
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
      const [state, setState] = React.useState('idle')
      return h('button', {
        onClick: () => {
          copyText(text)
            .then(() => { setState('done'); setTimeout(() => setState('idle'), 1600) })
            .catch(() => { setState('fail'); setTimeout(() => setState('idle'), 2200) })
        },
        style: {
          appearance: 'none',
          border: '1px solid ' + (state === 'done' ? 'rgba(20,184,166,.5)' : state === 'fail' ? 'rgba(212,56,13,.5)' : C.border),
          background: state === 'done' ? 'rgba(20,184,166,.12)' : state === 'fail' ? 'rgba(212,56,13,.08)' : 'transparent',
          color: state === 'done' ? C.ok : state === 'fail' ? C.danger : C.sub,
          borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12,
        },
      }, state === 'done' ? '✓ 已复制' : state === 'fail' ? '✗ 复制失败' : (label || '复制'))
    }

    // =====================================================================
    // 6. 搜索框
    // =====================================================================
    function SearchBox({ value, onChange, placeholder, inputRef }) {
      return h('div', { style: { position: 'relative', marginTop: 10 } },
        h('input', {
          ref: inputRef,
          value,
          onChange: (e) => onChange(e.target.value),
          placeholder,
          style: {
            width: '100%', boxSizing: 'border-box',
            padding: '7px 28px 7px 10px', fontSize: 12, borderRadius: 6,
            outline: 'none', border: '1px solid ' + C.border,
            background: C.card, color: C.text,
          },
        }),
        value
          ? h('button', {
              onClick: () => onChange(''),
              title: '清空',
              style: {
                position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                appearance: 'none', border: 'none', background: 'transparent',
                color: C.faint, cursor: 'pointer', fontSize: 14, padding: '0 4px',
              },
            }, '×')
          : null,
      )
    }

    // =====================================================================
    // 7. 视频风格
    // =====================================================================
    function StyleCard({ it, version, onOpen }) {
      const hue = SERIES_HUE[it.series] || '#888'
      const [broken, setBroken] = React.useState(false)

      return h('div', {
        onClick: () => onOpen(it),
        style: {
          width: 152, cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
          border: '1px solid ' + C.border, background: C.card,
          transition: 'transform .12s ease, box-shadow .12s ease',
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.10)'
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.boxShadow = 'none'
        },
      },
        h('div', {
          style: { width: 152, height: 86, background: hue + '22', position: 'relative', overflow: 'hidden' },
        },
          !broken
            ? h('img', {
                src: '/awkit/api/stills/' + encodeURIComponent(it.id) + '?v=' + version,
                loading: 'lazy',
                onError: () => setBroken(true),
                style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
              })
            : h('div', {
                style: {
                  width: '100%', height: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, fontWeight: 700, color: hue, opacity: 0.85,
                },
              }, String(it.name || it.id).slice(0, 1)),
        ),
        h('div', { style: { padding: '6px 8px 8px' } },
          h('div', {
            style: { fontSize: 12, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
            title: it.name,
          }, String(it.name)),
          h('div', { style: { fontSize: 10, color: C.faint, marginTop: 2 } }, it.id),
        ),
      )
    }

    function SeriesSection({ group, expanded, onExpand, onOpen, version }) {
      const CAP = expanded ? group.items.length : 8
      const shown = group.items.slice(0, CAP)
      const rest = group.items.length - shown.length
      return h('div', { style: { marginTop: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 } },
          h('strong', { style: { fontSize: 13, color: C.text } }, group.series),
          h('span', { style: { fontSize: 12, color: C.sub } }, group.label),
          h('span', { style: { fontSize: 11, color: C.faint } }, '· ' + group.items.length + ' 条'),
        ),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10 } },
          shown.map((it) => h(StyleCard, { key: it.id, it, onOpen, version }))),
        rest > 0
          ? h('div', { style: { marginTop: 8 } },
              h('button', {
                onClick: onExpand,
                style: {
                  appearance: 'none', border: 'none', background: 'transparent',
                  color: C.accent, cursor: 'pointer', fontSize: 12, padding: 0,
                },
              }, '展开全部 ' + group.items.length + ' 条 ↓'))
          : null,
      )
    }

    function StyleGrid({ items, query, onOpen, version }) {
      const [expandedSeries, setExpandedSeries] = React.useState({})
      const q = query.trim().toLowerCase()
      const filtered = q
        ? items.filter((it) =>
            it.id.toLowerCase().includes(q) ||
            String(it.name).toLowerCase().includes(q) ||
            (it.tags || []).some((t) => String(t).includes(q)))
        : items

      if (!filtered.length) {
        return h(Empty, { text: q ? '没有匹配「' + query + '」的风格' : '风格索引为空' })
      }

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

      return h('div', null,
        groups.map((g) =>
          h(SeriesSection, {
            key: g.series,
            group: g,
            // 搜索时全部展开；否则按用户点开的状态
            expanded: !!q || !!expandedSeries[g.series],
            onExpand: () => setExpandedSeries((p) => ({ ...p, [g.series]: true })),
            onOpen,
            version,
          })))
    }

    // =====================================================================
    // 8. 提示词 / 模板列表
    // =====================================================================
    function RowItem({ onClick, children }) {
      const [hover, setHover] = React.useState(false)
      return h('div', {
        onClick,
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        style: {
          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
          border: '1px solid ' + (hover ? C.border2 : C.border),
          background: hover ? C.hover : C.card,
          transition: 'background .12s ease, border-color .12s ease',
        },
      }, children)
    }

    function PromptList({ items, query, onOpen }) {
      const q = query.trim().toLowerCase()
      const filtered = q
        ? items.filter((it) =>
            it.slug.includes(q) ||
            String(it.title).toLowerCase().includes(q) ||
            String(it.preview).toLowerCase().includes(q))
        : items
      if (!filtered.length) return h(Empty, { text: q ? '没有匹配的提示词' : '暂无提示词' })

      return h('div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
        filtered.map((it) => h(RowItem, { key: it.slug + it.version, onClick: () => onOpen(it) },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('strong', { style: { fontSize: 13, color: C.text } }, it.title),
            h(Chip, null, it.version),
            h('div', { style: { flex: 1 } }),
            h('span', { style: { fontSize: 11, color: C.faint } }, it.chars + ' 字'),
          ),
          it.preview ? h('div', { style: { fontSize: 12, color: C.sub, marginTop: 4, lineHeight: 1.5 } }, it.preview + '…') : null,
        )))
    }

    function TemplateList({ items, query, onOpen }) {
      const q = query.trim().toLowerCase()
      const filtered = q
        ? items.filter((it) =>
            [it.id, it.title, it.description, it.lang, it.framework, it.kind]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)))
        : items
      if (!filtered.length) return h(Empty, { text: q ? '没有匹配的模板' : '暂无代码模板' })

      return h('div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
        filtered.map((it) => h(RowItem, { key: it.id, onClick: () => onOpen(it) },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
            h('strong', { style: { fontSize: 13, color: C.text } }, it.title),
            it.lang ? h(Chip, null, it.lang) : null,
            it.framework ? h(Chip, null, it.framework) : null,
            it.kind ? h(Chip, null, it.kind) : null,
            h('div', { style: { flex: 1 } }),
            h('span', { style: { fontSize: 11, color: C.faint } }, it.vars + ' 变量 · ' + it.files + ' 文件'),
          ),
          it.description ? h('div', { style: { fontSize: 12, color: C.sub, marginTop: 4, lineHeight: 1.5 } }, it.description) : null,
        )))
    }

    // =====================================================================
    // 9. 模板渲染器（B2）：变量表单 + 实时预览
    // =====================================================================
    function substitute(tpl, vars) {
      return String(tpl).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (whole, key) =>
        Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : whole)
    }

    function RenderPreview({ template, files, onCopy }) {
      const [vars, setVars] = React.useState(() => {
        const init = {}
        for (const v of template.vars || []) init[v.key] = v.example || ('<' + v.key + '>')
        return init
      })
      const [active, setActive] = React.useState(0)

      const file = files[active] || files[0]
      const rendered = file ? substitute(file.content || '', vars) : ''
      const missing = [...rendered.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1])

      return h('div', { style: { marginTop: 4 } },
        h('div', { style: { fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 } }, '变量'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
          (template.vars || []).map((v) =>
            h('label', { key: v.key, style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              h('span', { style: { fontSize: 11, color: C.sub } },
                v.key,
                h('span', { style: { color: C.faint, marginLeft: 4 } }, '(' + v.type + ')')),
              h('input', {
                value: vars[v.key] || '',
                onChange: (e) => setVars((prev) => ({ ...prev, [v.key]: e.target.value })),
                style: {
                  padding: '4px 8px', fontSize: 12, borderRadius: 5,
                  border: '1px solid ' + C.border, outline: 'none',
                  background: C.card, color: C.text,
                },
              })))),

        files.length > 1
          ? h('div', { style: { display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' } },
              files.map((f, i) =>
                h('button', {
                  key: f.to,
                  onClick: () => setActive(i),
                  style: {
                    appearance: 'none', cursor: 'pointer', fontSize: 11,
                    padding: '2px 8px', borderRadius: 4,
                    border: '1px solid ' + (i === active ? C.accent : C.border),
                    background: i === active ? C.accent : 'transparent',
                    color: i === active ? '#fff' : C.sub,
                  },
                }, f.to)))
          : null,

        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
          h('strong', { style: { fontSize: 12, color: C.text } }, '渲染结果'),
          h('span', { style: { fontSize: 11, color: C.faint } }, rendered.length + ' 字符'),
          h('div', { style: { flex: 1 } }),
          h(CopyBtn, { text: rendered, label: '复制渲染结果' }),
          onCopy ? h(Btn, { onClick: () => onCopy(rendered) }, '发给对话') : null,
        ),
        missing.length
          ? h('div', { style: { fontSize: 11, color: '#b45309', marginBottom: 6 } },
              '未替换的变量：' + missing.join(', '))
          : null,
        h('pre', {
          style: {
            margin: 0, padding: 12, borderRadius: 8, background: C.layer2,
            fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            color: C.text, fontFamily: MONO,
          },
        }, rendered || '(空)'),
      )
    }

    // =====================================================================
    // 10. 分镜生成器（B3）：把风格提示词 + 任务参数合成一段可复制指令
    // =====================================================================
    const PLATFORM_RULES = {
      douyin: '竖屏 9:16，字幕放下 1/3 安全区，前 3 秒必须出冲突或悬念',
      bilibili: '横屏 16:9，字幕居中偏下，可慢起，可用片头',
      wechat: '竖屏 9:16，字幕放下 1/3，同抖音节奏',
      youtube: '横屏 16:9，字幕居中偏下，hook 可留到 15 秒',
    }

    function StoryboardForge({ style }) {
      const [open, setOpen] = React.useState(false)
      const [topic, setTopic] = React.useState('')
      const [platform, setPlatform] = React.useState('douyin')
      const [duration, setDuration] = React.useState(45)

      const prompt = React.useMemo(() => {
        if (!open) return ''
        return [
          '你是资深 MV / CG 导演兼分镜师。请严格按下面这条视觉风格的实现方式，为给定主题产出可直接执行的分镜表。',
          '',
          '【视觉风格 · ' + style.id + ' ' + style.name + '（' + (style.seriesLabel || style.series) + '）】',
          style.markdown || '(风格原文缺失)',
          '',
          '【本次任务】',
          '- 主题：' + (topic || '（未填写）'),
          '- 平台：' + platform + '（' + PLATFORM_RULES[platform] + '）',
          '- 总时长：' + duration + ' 秒',
          '',
          '【输出格式】',
          'Markdown 表格，列为：| # | 时间码 | 景别 | 画面描述 | 字幕 | 转场 | 风格节点 |',
          '',
          '【硬约束】',
          '- 画面描述必须是"能被画出来"的具体指令，禁止"充满张力""很有感觉"这类形容词',
          '- 每个镜头的风格节点列填 ' + style.id,
          '- 口播字数与时长匹配：中文约 4-5 字/秒',
          '- 不得出现真实明星、品牌 logo、版权角色',
        ].join('\n')
      }, [open, topic, platform, duration, style])

      if (!open) {
        return h('div', { style: { marginTop: 10 } },
          h(Btn, { onClick: () => setOpen(true) }, '生成分镜指令 →'))
      }

      return h('div', {
        style: {
          marginTop: 12, padding: 12, borderRadius: 8,
          border: '1px solid ' + C.border2, background: C.layer2,
        },
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
          h('strong', { style: { fontSize: 12, color: C.text } }, '生成分镜指令'),
          h('div', { style: { flex: 1 } }),
          h('button', {
            onClick: () => setOpen(false),
            style: {
              appearance: 'none', border: 'none', background: 'transparent',
              color: C.faint, cursor: 'pointer', fontSize: 14,
            },
          }, '×')),

        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, marginBottom: 10 } },
          h('input', {
            value: topic,
            onChange: (e) => setTopic(e.target.value),
            placeholder: '主题，如「别熬夜」',
            style: {
              padding: '5px 9px', fontSize: 12, borderRadius: 5,
              border: '1px solid ' + C.border, outline: 'none',
              background: C.card, color: C.text,
            },
          }),
          h('select', {
            value: platform,
            onChange: (e) => setPlatform(e.target.value),
            style: {
              padding: '5px 8px', fontSize: 12, borderRadius: 5,
              border: '1px solid ' + C.border, background: C.card, color: C.text,
            },
          }, PLATFORMS.map((p) => h('option', { key: p.id, value: p.id }, p.label))),
          h('input', {
            type: 'number',
            value: duration,
            min: 5,
            max: 600,
            onChange: (e) => setDuration(Number(e.target.value) || 0),
            style: {
              width: 70, padding: '5px 8px', fontSize: 12, borderRadius: 5,
              border: '1px solid ' + C.border, background: C.card, color: C.text,
            },
          })),

        h('div', { style: { display: 'flex', gap: 8, marginBottom: 8 } },
          h(CopyBtn, { text: prompt, label: '复制这段指令' }),
          h('span', { style: { fontSize: 11, color: C.faint, alignSelf: 'center' } },
            '复制后直接粘给模型即可')),

        h('pre', {
          style: {
            margin: 0, padding: 10, borderRadius: 6, background: C.card,
            fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 260, overflowY: 'auto', color: C.sub, fontFamily: MONO,
          },
        }, prompt),
      )
    }

    // =====================================================================
    // 11. 详情视图
    // =====================================================================
    function DetailHeader({ onBack, id, title, extra }) {
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
        h('button', {
          onClick: onBack,
          style: {
            appearance: 'none', border: '1px solid ' + C.border, background: 'transparent',
            borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: C.sub,
          },
        }, '← 返回'),
        h('strong', { style: { fontSize: 14, color: C.text } }, id),
        title ? h('span', { style: { fontSize: 13, color: C.sub } }, title) : null,
        extra || null,
        h('div', { style: { flex: 1 } }),
      )
    }

    const PRE_STYLE = {
      margin: 0, padding: 12, borderRadius: 8, background: C.layer2,
      fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      color: C.text, fontFamily: MONO,
    }

    function DetailView({ state, onBack, onSendToChat }) {
      const { kind, row, loading, data, error } = state

      React.useEffect(() => {
        function onKey(e) {
          if (e.key === 'Escape') onBack()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onBack])

      const header = h(DetailHeader, {
        onBack,
        id: row.id || row.title || row.slug,
        title: row.name || row.title,
        extra: row.series ? h(Chip, { tone: 'accent' }, row.series) : null,
      })

      if (loading) {
        return h('div', null, header,
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', color: C.sub, fontSize: 12 } },
            h(Spinner), '读取中…'))
      }
      if (error) {
        return h('div', null, header,
          h('div', {
            style: {
              padding: 12, borderRadius: 8,
              background: 'rgba(212,56,13,.08)', color: C.danger, fontSize: 12,
            },
          }, error))
      }

      // ---------- 风格 ----------
      if (kind === 'style') {
        const md = (data && data.markdown) || ''
        return h('div', null, header,
          h('div', { style: { display: 'flex', gap: 16, marginBottom: 12, alignItems: 'flex-start', flexWrap: 'wrap' } },
            h('img', {
              src: '/awkit/api/stills/' + encodeURIComponent(row.id),
              style: {
                width: 240, height: 135, objectFit: 'cover', borderRadius: 8,
                border: '1px solid ' + C.border, flexShrink: 0,
              },
              onError: (e) => { e.currentTarget.style.display = 'none' },
            }),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('div', {
                style: {
                  padding: '10px 12px', borderRadius: 8, background: C.layer2,
                  marginBottom: 12, fontSize: 12, color: C.sub, lineHeight: 1.7,
                },
              },
                h('div', { style: { fontWeight: 600, color: C.text, marginBottom: 4 } }, '怎么用'),
                h('div', null, '① 复制提示词，作为生成指令交给模型'),
                h('div', null, '② 或点「生成分镜指令」，带上主题一次产出镜头表'),
                h('div', { style: { marginTop: 6, color: C.faint, fontSize: 11 } },
                  (data && data.seriesLabel ? data.seriesLabel : row.series) + ' · ' + row.id +
                  (md ? ' · ' + md.length + ' 字符' : '')),
              ),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h(CopyBtn, { text: md, label: '复制提示词' }),
                onSendToChat
                  ? h(Btn, {
                      onClick: () => onSendToChat(
                        '请用「' + row.id + ' ' + row.name + '」这个视觉风格。以下是风格实现说明：\n\n' + md),
                    }, '发给对话')
                  : null),
              data && data.tags && data.tags.length
                ? h('div', { style: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 } },
                    data.tags.slice(0, 8).map((t) => h(Chip, { key: t }, t)))
                : null,
            )),
          md
            ? h('pre', { style: PRE_STYLE }, md)
            : h(Empty, { text: '这条风格没有收录正文（内容包可能不完整）' }),
          h(StoryboardForge, { style: { id: row.id, name: row.name, series: row.series, seriesLabel: data && data.seriesLabel, markdown: md } }),
        )
      }

      // ---------- 提示词 ----------
      if (kind === 'prompt') {
        const md = (data && data.markdown) || ''
        return h('div', null, header,
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' } },
            h(CopyBtn, { text: md, label: '复制提示词' }),
            onSendToChat
              ? h(Btn, { onClick: () => onSendToChat(md) }, '发给对话')
              : null,
            h('span', { style: { fontSize: 12, color: C.faint } }, md.length + ' 字符')),
          h('pre', { style: PRE_STYLE }, md),
        )
      }

      // ---------- 模板 ----------
      const t = (data && data.template) || {}
      return h('div', null, header,
        t.description
          ? h('div', { style: { fontSize: 12, color: C.sub, marginBottom: 12, lineHeight: 1.6 } }, t.description)
          : null,
        (data && data.files && data.files.length)
          ? h(RenderPreview, { template: t, files: data.files, onCopy: onSendToChat })
          : h(Empty, { text: '模板没有可渲染的文件' }),
        Array.isArray(t.review) && t.review.length
          ? h('div', { style: { marginTop: 14 } },
              h('div', { style: { fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 } }, '交付前自查'),
              t.review.map((r, i) =>
                h('div', { key: i, style: { fontSize: 12, color: C.sub, lineHeight: 1.8 } }, '☐ ' + r)))
          : null,
      )
    }

    // =====================================================================
    // 12. 主面板
    // =====================================================================
    function Panel(props) {
      const [ovState, reload] = useJson('/awkit/api/overview')
      const { data, loading, error } = ovState

      const [tab, setTab] = React.useState('styles')
      const [query, setQuery] = React.useState('')
      const [detail, setDetail] = React.useState(null)
      const [prefs, setPrefs] = React.useState(loadPrefs)
      const inputRef = React.useRef(null)

      const version = (data && data.contentVersion) || '0'

      React.useEffect(() => { savePrefs(prefs) }, [prefs])

      // 按 / 聚焦搜索
      React.useEffect(() => {
        function onKey(e) {
          if (e.key === '/' && document.activeElement !== inputRef.current) {
            e.preventDefault()
            inputRef.current && inputRef.current.focus()
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [])

      function openStyle(row) {
        setDetail({ kind: 'style', row, loading: true })
        fetch('/awkit/api/styles/' + encodeURIComponent(row.id))
          .then((r) => r.json())
          .then((d) => setDetail({ kind: 'style', row, loading: false, data: d, error: d && d.ok ? null : (d && d.error) }))
          .catch((e) => setDetail({ kind: 'style', row, loading: false, error: String((e && e.message) || e) }))
      }

      function openPrompt(row) {
        setDetail({ kind: 'prompt', row, loading: true })
        fetch('/awkit/api/prompts/' + encodeURIComponent(row.slug) + '/' + encodeURIComponent(row.version))
          .then((r) => r.json())
          .then((d) => setDetail({ kind: 'prompt', row, loading: false, data: d, error: d && d.ok ? null : (d && d.error) }))
          .catch((e) => setDetail({ kind: 'prompt', row, loading: false, error: String((e && e.message) || e) }))
      }

      function openTemplate(row) {
        setDetail({ kind: 'template', row, loading: true })
        fetch('/awkit/api/templates/' + row.path.split('/').map(encodeURIComponent).join('/'))
          .then((r) => r.json())
          .then((d) => setDetail({ kind: 'template', row, loading: false, data: d, error: d && d.ok ? null : (d && d.error) }))
          .catch((e) => setDetail({ kind: 'template', row, loading: false, error: String((e && e.message) || e) }))
      }

      const counts = {
        styles: data ? data.styles.total : null,
        prompts: data ? data.prompts.total : null,
        templates: data ? data.templates.total : null,
      }

      const shellStyle = {
        height: '100%', boxSizing: 'border-box',
        overflowY: 'auto', overflowX: 'hidden',
        padding: '16px 20px 40px', color: C.text,
      }

      if (detail) {
        return h('div', { className: 'awkit-scroll', style: shellStyle },
          h(DetailView, {
            state: detail,
            onBack: () => setDetail(null),
            onSendToChat: typeof props.sendToChat === 'function' ? props.sendToChat : null,
          }))
      }

      const placeholder =
        tab === 'styles' ? '搜索 id / 名称 / 标签，如「水墨」「CRT」「A3」' :
        tab === 'prompts' ? '搜索提示词' : '搜索模板 / 语言 / 框架'

      return h('div', { className: 'awkit-scroll', style: shellStyle },
        h('style', null, [
          '.awkit-scroll{scrollbar-width:thin;scrollbar-color:rgba(128,128,128,.45) transparent}',
          '.awkit-scroll::-webkit-scrollbar{width:10px;height:10px}',
          '.awkit-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.45);border-radius:5px;border:2px solid transparent;background-clip:content-box}',
          '.awkit-scroll::-webkit-scrollbar-thumb:hover{background:rgba(128,128,128,.72);background-clip:content-box}',
          '@keyframes awkit-spin{to{transform:rotate(360deg)}}',
          '@keyframes awkit-pulse{0%,100%{opacity:.55}50%{opacity:1}}',
        ].join('')),

        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
          h('h2', { style: { fontSize: 16, fontWeight: 600, margin: 0 } }, 'AI 工作流'),
          h('span', { style: { fontSize: 11, color: C.faint } },
            data ? '340 风格 · 本地内容 ' + version : ''),
          h('div', { style: { flex: 1 } }),
          h(Btn, { onClick: reload, disabled: loading }, loading ? '刷新中…' : '刷新')),

        error
          ? h('div', {
              style: {
                padding: '8px 12px', marginBottom: 10, borderRadius: 8,
                background: 'rgba(212,56,13,.08)', color: C.danger, fontSize: 12,
              },
            }, '接口未接通：' + error)
          : null,

        h('div', {
          style: {
            position: 'sticky', top: 0, zIndex: 2,
            background: 'var(--dsw-alias-bg-layer-1, #ffffff)',
            paddingTop: 2,
          },
        },
          h(TabBar, { tabs: TABS, active: tab, counts, onPick: (k) => { setTab(k); setQuery(''); setDetail(null) } }),
          h(SearchBox, { value: query, onChange: setQuery, placeholder, inputRef })),

        h('div', { style: { marginTop: 10 } },
          loading && !data ? h(Skeleton, { rows: 8 }) :
          !data ? h(Empty, { text: '暂无数据', action: h(Btn, { onClick: reload }, '重试') }) :
          tab === 'styles' ? h(StyleGrid, { items: data.styles.items, query, onOpen: openStyle, version }) :
          tab === 'prompts' ? h(PromptList, { items: data.prompts.items, query, onOpen: openPrompt }) :
          h(TemplateList, { items: data.templates.items, query, onOpen: openTemplate })),
      )
    }

    // 侧栏图标
    function KitIcon() {
      return h('svg', {
        width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8,
        strokeLinecap: 'round', strokeLinejoin: 'round',
      },
        h('rect', { x: 3, y: 3, width: 18, height: 5, rx: 1.2 }),
        h('rect', { x: 3, y: 11, width: 9, height: 10, rx: 1.2 }),
        h('path', { d: 'M16 13v6' }),
        h('path', { d: 'M13 16h6' }),
      )
    }

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
