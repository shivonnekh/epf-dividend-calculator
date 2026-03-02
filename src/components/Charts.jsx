import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { formatRM } from '../utils/formatters'

const BLUE = '#2563eb'
const GREEN = '#10b981'
const BLUE_LIGHT = '#93c5fd'

function RMTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600 dark:text-gray-400">{p.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatRM(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Charts({ monthData }) {
  const chartData = monthData.map(m => ({
    month: m.monthNameShort,
    balance: m.openingBalance,
    contribution: m.contribution,
    dividend: m.dividend,
    cumBalance: m.closingBalance,
  }))

  // average dividend line
  const avgDividend = monthData.reduce((s, m) => s + m.dividend, 0) / 12

  const tickStyle = { fontSize: 11, fill: '#9ca3af' }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Balance Growth */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Balance Growth (Jan → Dec)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              width={48}
            />
            <Tooltip content={<RMTooltip />} />
            <Line
              type="monotone"
              dataKey="balance"
              stroke={BLUE}
              strokeWidth={2.5}
              dot={{ fill: BLUE, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              name="Balance Used"
            />
            <Line
              type="monotone"
              dataKey="cumBalance"
              stroke={BLUE_LIGHT}
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              name="Month-end Balance"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-blue-600" /> Balance for Dividend</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-blue-300 border-dashed" /> Month-end Balance</span>
        </div>
      </div>

      {/* Monthly Dividends */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Monthly Dividend Earned
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v.toFixed(0)}
              width={48}
            />
            <Tooltip content={<RMTooltip />} />
            <ReferenceLine
              y={avgDividend}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{ value: 'Avg', position: 'right', fontSize: 10, fill: '#f59e0b' }}
            />
            <Bar
              dataKey="dividend"
              fill={GREEN}
              radius={[4, 4, 0, 0]}
              name="Dividend"
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2.5 bg-green-500 rounded-sm" /> Monthly Dividend</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-amber-500" /> Average</span>
        </div>
      </div>

      {/* Contributions vs Dividend */}
      <div className="card p-4 lg:col-span-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Monthly Contributions vs Dividend
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
              width={48}
            />
            <Tooltip content={<RMTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="contribution" fill={BLUE} radius={[3, 3, 0, 0]} name="Contribution" maxBarSize={28} />
            <Bar dataKey="dividend" fill={GREEN} radius={[3, 3, 0, 0]} name="Dividend" maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
