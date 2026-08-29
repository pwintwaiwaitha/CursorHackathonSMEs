import { useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { useApp } from '../context/useApp'
import { buildForecast } from '../lib/cashflow'
import { formatDisplayDate, formatShortDate, todayIsoDate } from '../lib/dates'
import { formatCompactMmk, formatMmk } from '../lib/money'

export function ForecastPage() {
  const { store } = useApp()
  const [horizon, setHorizon] = useState<14 | 30>(14)
  const forecast = buildForecast(store, horizon, store.scenarios, todayIsoDate())
  const chartData = forecast.points.map((point) => ({
    date: formatShortDate(point.date),
    balance: point.projectedBalanceMmk,
    inflows: point.inflowsMmk,
    outflows: point.outflowsMmk,
  }))

  return (
    <div>
      <PageHeader
        title="Cash forecast"
        subtitle="This uses your check-ins, customer money coming in, supplier bills, and normal daily sales."
      />

      <div className="mb-4 flex gap-2">
        {([14, 30] as const).map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setHorizon(days)}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              horizon === days
                ? 'border-navy bg-navy text-white'
                : 'border-line bg-white text-ink'
            }`}
          >
            {days} days
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Starts from" value={forecast.startingBalanceMmk} />
        <StatCard
          label="Lowest balance"
          value={forecast.lowestBalanceMmk}
          tone={forecast.lowestBalanceMmk < 0 ? 'risk' : 'default'}
        />
        <StatCard label="End of period" value={forecast.endingBalanceMmk} />
        <StatCard
          label="Shortage days"
          value={`${forecast.shortageDays}`}
          tone={forecast.shortageDays > 0 ? 'risk' : 'healthy'}
          hint={
            forecast.firstShortageDate
              ? `First tight day: ${formatDisplayDate(forecast.firstShortageDate)}`
              : 'No shortage in this period'
          }
        />
      </div>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <h2 className="mb-3 font-semibold text-navy">Projected cash</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#d5dee8" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                width={78}
                tickFormatter={(value: number) => formatCompactMmk(value)}
              />
              <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                name="Cash"
                stroke="#0b3d6e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="inflows"
                name="Money in"
                stroke="#1a7f4c"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="outflows"
                name="Money out"
                stroke="#c0392b"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="font-semibold text-navy">Why cash may get tight</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
            {forecast.causes.map((cause) => (
              <li key={cause}>{cause}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="font-semibold text-navy">Practical actions</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
            {forecast.recommendedActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
