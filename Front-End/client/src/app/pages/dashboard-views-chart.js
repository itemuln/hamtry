import { createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

const views = [
  { week: '1-р', count: 164 },
  { week: '2-р', count: 190 },
  { week: '3-р', count: 210 },
  { week: '4-р', count: 248 },
]

export function mountViewsChart(container) {
  const root = createRoot(container)
  root.render(h(ResponsiveContainer, { width: '100%', height: '100%' },
    h(AreaChart, { data: views, margin: { top: 4, right: 2, bottom: 0, left: 2 } },
      h(XAxis, { dataKey: 'week', axisLine: false, tickLine: false, tickMargin: 2, interval: 0 }),
      h(Tooltip, { labelFormatter: label => `${label} долоо хоног`, formatter: value => [`${value} үзэлт`, 'Зарын үзэлт'] }),
      h(Area, { type: 'monotone', dataKey: 'count', baseValue: 0, stroke: 'var(--brand-primary)', strokeWidth: 2, fill: 'var(--brand-primary)', fillOpacity: 0.18, dot: false, activeDot: { r: 3, fill: 'var(--brand-primary)' } }),
    ),
  ))
  return () => root.unmount()
}
