import type { ReactNode } from 'react'

export interface {{Name}}Props {
  title: string
  items: string[]
  loading?: boolean
  error?: string | null
  children?: ReactNode
}

export function {{Name}}({ title, items, loading = false, error = null }: {{Name}}Props) {
  if (loading) return <div className="{{name}} {{name}}--loading">加载中…</div>
  if (error) return <div className="{{name}} {{name}}--error">{error}</div>
  if (!items.length) return <div className="{{name}} {{name}}--empty">暂无数据</div>

  return (
    <section className="{{name}}">
      <h3 className="{{name}}__title">{title}</h3>
      <ul className="{{name}}__list">
        {items.map((item) => (
          <li key={item} className="{{name}}__item">{item}</li>
        ))}
      </ul>
    </section>
  )
}
