import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import { formatMoney } from '../../lib/money'

export default function TenantCostChart({ data = [], height = 240 }) {
  const { dark } = useTheme()

  const rows = (data || []).map((t) => ({
    name: t.companyName || 'Tenant',
    amount: Number(t.amount) || 0,
    kWh: Number(t.totalKwh) || 0,
  }))

  const fill = dark ? '#2dd4bf' : '#0f766e'
  const grid = dark ? '#2a3140' : '#e5e7eb'
  const tick = dark ? '#94a3b8' : '#6b7280'

  if (!rows.length) {
    return (
      <div className="ui-card flex h-60 items-center justify-center border-dashed text-sm text-ink-muted">
        No tenant costs for this period yet.
      </div>
    )
  }

  return (
    <div className="ui-card p-3 xs:p-4 md:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink dark:text-white">Cost by tenant</h3>
        <p className="text-xs text-ink-muted">Current period</p>
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: tick, fontSize: 11 }}
              interval={0}
              angle={rows.length > 3 ? -20 : 0}
              textAnchor={rows.length > 3 ? 'end' : 'middle'}
              height={rows.length > 3 ? 50 : 30}
              stroke={grid}
            />
            <YAxis
              tick={{ fill: tick, fontSize: 11 }}
              stroke={grid}
              width={48}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              contentStyle={{
                background: dark ? '#1a2332' : '#fff',
                border: `1px solid ${grid}`,
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) =>
                name === 'amount' ? [formatMoney(value), 'Amount'] : [value, name]
              }
            />
            <Bar
              dataKey="amount"
              fill={fill}
              radius={[6, 6, 0, 0]}
              isAnimationActive
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
