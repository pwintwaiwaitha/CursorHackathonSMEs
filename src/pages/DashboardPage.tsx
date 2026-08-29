import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { HealthBadge } from '../components/ui/HealthBadge'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { useApp } from '../context/useApp'
import {
  assessCashFlowHealth,
  buildForecast,
  checkInNetMmk,
  getCheckInForDate,
  getCurrentCashMmk,
} from '../lib/cashflow'
import { formatShortDate, todayIsoDate } from '../lib/dates'
import { formatCompactMmk, formatMmk } from '../lib/money'

export function DashboardPage() {
  const { store } = useApp()
  const today = todayIsoDate()
  const currentCash = getCurrentCashMmk(store)
  const forecast = buildForecast(store, 14, store.scenarios, today)
  const health = assessCashFlowHealth(store, forecast)
  const todayCheckIn = getCheckInForDate(store, today)
  const chartData = forecast.points.map((point) => ({
    date: formatShortDate(point.date),
    balance: point.projectedBalanceMmk,
  }))

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="See today’s cash, the next 14 days, and what to do next."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <HealthBadge status={health.status} />
        <p className="text-sm text-muted">{health.summary}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cash now"
          value={currentCash}
          hint="From starting cash plus check-ins"
          tone={currentCash < 0 ? 'risk' : 'healthy'}
        />
        <StatCard
          label="Cash cover"
          value={`${health.daysOfCash} days`}
          hint="How long cash can pay normal daily costs"
        />
        <StatCard
          label="Lowest in 14 days"
          value={forecast.lowestBalanceMmk}
          tone={forecast.lowestBalanceMmk < 0 ? 'risk' : 'default'}
        />
        <StatCard
          label="Health score"
          value={`${health.score} / 100`}
          tone={
            health.status === 'healthy'
              ? 'healthy'
              : health.status === 'watch'
                ? 'watch'
                : 'risk'
          }
        />
      </div>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-navy">14-day cash path</h2>
          <Link to="/forecast" className="text-sm font-medium text-bank-blue">
            Open forecast
          </Link>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid stroke="#d5dee8" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value: number) => formatCompactMmk(value)}
                width={78}
              />
              <Tooltip
                formatter={(value) => formatMmk(Number(value ?? 0))}
                labelStyle={{ color: '#0b3d6e' }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#1a5fa8"
                fill="#e8f1fa"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="font-semibold text-navy">Daily Cash Check-in</h2>
          {todayCheckIn ? (
            <p className="mt-2 text-sm text-muted">
              Today is saved. Net cash movement:{' '}
              <strong className="text-ink">{formatMmk(checkInNetMmk(todayCheckIn))}</strong>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              You have not recorded today yet. This takes about one minute.
            </p>
          )}
          <Link
            to="/check-in"
            className="mt-4 inline-flex rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            {todayCheckIn ? 'Edit today’s check-in' : 'Do today’s check-in'}
          </Link>
        </section>

        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="font-semibold text-navy">What to do now</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-ink">
            {forecast.recommendedActions.slice(0, 3).map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/scenarios" className="text-sm font-medium text-bank-blue">
              Try a what-if plan
            </Link>
            <Link to="/reports" className="text-sm font-medium text-bank-blue">
              Weekly report
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
