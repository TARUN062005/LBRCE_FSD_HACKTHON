import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getSocket } from '../../lib/socket'
import { useTheme } from '../../context/ThemeContext'

function formatTick(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

/**
 * Live site power chart — seeded by REST, appended via site:update sockets.
 */
export default function PowerUsageChart({ initialData = [], height = 240 }) {
  const { dark } = useTheme()
  const [points, setPoints] = useState(() => normalize(initialData))

  useEffect(() => {
    setPoints(normalize(initialData))
  }, [initialData])

  useEffect(() => {
    const socket = getSocket()

    const onSiteUpdate = (payload) => {
      if (payload?.usedKw == null) return
      const next = {
        time: payload.at || new Date().toISOString(),
        usedKw: Number(payload.usedKw) || 0,
        capacityKw: Number(payload.maxCapacityKw) || 0,
      }
      setPoints((prev) => {
        const merged = [...prev, next]
        return merged.slice(-48)
      })
    }

    socket.on('site:update', onSiteUpdate)
    return () => socket.off('site:update', onSiteUpdate)
  }, [])

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        label: formatTick(p.time),
      })),
    [points],
  )

  const stroke = dark ? '#2dd4bf' : '#0f766e'
  const grid = dark ? '#2a3140' : '#e5e7eb'
  const tick = dark ? '#94a3b8' : '#6b7280'

  if (!chartData.length) {
    return (
      <div className="ui-card flex h-60 items-center justify-center border-dashed text-sm text-ink-muted">
        Waiting for live power samples…
      </div>
    )
  }

  return (
    <div className="ui-card p-3 xs:p-4 md:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink dark:text-white">Site power usage</h3>
        <p className="text-xs text-ink-muted">Live</p>
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="powerFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: tick, fontSize: 11 }}
              minTickGap={28}
              stroke={grid}
            />
            <YAxis
              tick={{ fill: tick, fontSize: 11 }}
              stroke={grid}
              unit=" kW"
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: dark ? '#1a2332' : '#fff',
                border: `1px solid ${grid}`,
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) => [
                `${value} kW`,
                name === 'usedKw' ? 'Used' : 'Capacity',
              ]}
            />
            <Area
              type="monotone"
              dataKey="capacityKw"
              stroke={dark ? '#64748b' : '#94a3b8'}
              fill="transparent"
              strokeDasharray="4 4"
              isAnimationActive
              animationDuration={600}
            />
            <Area
              type="monotone"
              dataKey="usedKw"
              stroke={stroke}
              fill="url(#powerFill)"
              strokeWidth={2}
              isAnimationActive
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function normalize(data) {
  return (data || []).map((p) => ({
    time: p.time || p.at,
    usedKw: Number(p.usedKw) || 0,
    capacityKw: Number(p.capacityKw ?? p.maxCapacityKw) || 0,
  }))
}
