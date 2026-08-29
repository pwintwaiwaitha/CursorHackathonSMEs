import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AiAdvicePanel } from '../forecast/AiAdvicePanel'
import { ConfidenceMeter } from './ConfidenceMeter'
import { EmptyState } from '../ui/EmptyState'
import { TermTooltip } from '../ui/TermTooltip'
import type { AppStore } from '../../storage/types'
import type { ForecastResult, PreferredLanguage } from '../../types/models'
import { HEALTH_LABELS, type CashFlowHealth } from '../../types/models'
import { buildAiAdviceRequest } from '../../lib/aiAdvice'
import { bilingualLine, pickLine } from '../../lib/checkInCopy'
import { DASHBOARD_COPY } from '../../lib/dashboardCopy'
import { FORECAST_LEVELS } from '../../lib/forecastEngine'
import { formatCompactMmk, formatMmk } from '../../lib/money'
import {
  formatHiddenMmk,
  type CashCoverResult,
  type LowestCashResult,
} from '../../lib/dashboardMetrics'

const PIE_COLORS = [
  '#174C3C',
  '#237A57',
  '#2F9368',
  '#B8DEC7',
  '#F2C94C',
  '#7A5A00',
  '#C0784A',
  '#66766F',
]

export function FinancialDetails({
  store,
  language,
  hideAmounts,
  cashCover,
  lowest,
  health,
  totalReceivablesMmk,
  weekForecast,
  balanceChart,
  flowChart,
  expenses,
}: {
  store: AppStore
  language: PreferredLanguage
  hideAmounts: boolean
  cashCover: CashCoverResult
  lowest: LowestCashResult
  health: CashFlowHealth
  totalReceivablesMmk: number
  weekForecast: ForecastResult
  balanceChart: { date: string; historical: number | null; forecast: number | null }[]
  flowChart: { date: string; inflows: number; outflows: number }[]
  expenses: { name: string; amountMmk: number }[]
}) {
  const coverLabel =
    cashCover.kind === 'days'
      ? `${cashCover.days} days`
      : cashCover.kind === 'more_than_year'
        ? pickLine(DASHBOARD_COPY.moreThanYear, language)
        : pickLine(DASHBOARD_COPY.notEnoughData, language)

  return (
    <details className="rounded-[16px] border border-line bg-white p-3">
      <summary className="cursor-pointer text-lg font-semibold text-navy">
        {pickLine(DASHBOARD_COPY.viewDetails, language)}
      </summary>
      <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-[16px] border border-line p-3">
            <p className="font-semibold text-muted">
              <TermTooltip
                label={pickLine(DASHBOARD_COPY.cashCover, language)}
                explanation={bilingualLine(DASHBOARD_COPY.cashCoverTip, language)}
              />
            </p>
            <p className="mt-2 text-2xl font-bold text-navy">{coverLabel}</p>
          </article>
          <article className="rounded-[16px] border border-line p-3">
            <p className="font-semibold text-muted">
              {pickLine(DASHBOARD_COPY.lowest14, language)}
            </p>
            {lowest.kind === 'no_movements' ? (
              <div>
                <p className="mt-2 text-base font-semibold text-navy">
                  {pickLine(DASHBOARD_COPY.noMovements, language)}
                </p>
                <Link
                  to="/payments"
                  className="mt-2 inline-flex min-h-11 items-center rounded-[14px] bg-navy px-4 font-semibold text-white"
                >
                  {pickLine(DASHBOARD_COPY.addBills, language)}
                </Link>
              </div>
            ) : (
              <div>
                <p className="mt-2 text-2xl font-bold text-navy">
                  {formatHiddenMmk(hideAmounts, lowest.amountMmk)}
                </p>
                {lowest.earlyEstimate ? (
                  <p className="mt-1 text-base font-medium text-watch-ink">
                    {pickLine(DASHBOARD_COPY.earlyEstimate, language)}
                  </p>
                ) : null}
              </div>
            )}
          </article>
          <article className="rounded-[16px] border border-line p-3">
            <p className="font-semibold text-muted">
              {pickLine(DASHBOARD_COPY.healthScore, language)}
            </p>
            <p className="mt-2 text-2xl font-bold text-navy">
              {HEALTH_LABELS[health.status]} · {health.score}/100
            </p>
            <p className="mt-1 text-base text-ink">{health.summary}</p>
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold text-navy">
                {pickLine(DASHBOARD_COPY.howHealth, language)}
              </summary>
              <p className="mt-2 text-base text-muted">
                {pickLine(DASHBOARD_COPY.howHealthBody, language)}
              </p>
              {language === 'my' ? (
                <p className="mt-2 text-base text-muted">{DASHBOARD_COPY.howHealthBody.en}</p>
              ) : null}
            </details>
          </article>
          <article className="rounded-[16px] border border-line p-3">
            <p className="font-semibold text-muted">
              {pickLine(DASHBOARD_COPY.totalReceivables, language)}
            </p>
            <p className="mt-2 text-2xl font-bold text-navy">
              {formatHiddenMmk(hideAmounts, totalReceivablesMmk)}
            </p>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[16px] border border-line p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-navy">Cash balance</h3>
              <Link to="/forecast" className="inline-flex min-h-11 items-center font-semibold text-navy">
                Full forecast
              </Link>
            </div>
            {balanceChart.length === 0 ? (
              <EmptyState title="No balance line yet" message="Save a check-in to draw cash over time." />
            ) : (
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={balanceChart}>
                    <CartesianGrid stroke="#DDE7E0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis
                      width={72}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value: number) => formatCompactMmk(value)}
                    />
                    <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="historical"
                      name="Recorded"
                      stroke="#174C3C"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Forecast"
                      stroke="#2F9368"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
          <section className="rounded-[16px] border border-line p-3">
            <h3 className="mb-3 font-semibold text-navy">Cash in versus cash out</h3>
            {flowChart.length === 0 ? (
              <EmptyState title="No flow chart yet" message="The 7-day forecast will fill this chart." />
            ) : (
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowChart}>
                    <CartesianGrid stroke="#DDE7E0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis
                      width={72}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value: number) => formatCompactMmk(value)}
                    />
                    <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
                    <Legend />
                    <Bar dataKey="inflows" name="Money in" fill="#237A57" />
                    <Bar dataKey="outflows" name="Money out" fill="#D9534F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>

        <section className="rounded-[16px] border border-line p-3">
          <h3 className="mb-3 font-semibold text-navy">Expense categories</h3>
          {expenses.length === 0 ? (
            <EmptyState
              title="No expense split yet"
              message="Add expense lines in Daily Cash Check-in to see categories."
            />
          ) : (
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenses} dataKey="amountMmk" nameKey="name" innerRadius={50} outerRadius={80}>
                    {expenses.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <p className="flex flex-wrap gap-4">
          <Link to="/forecast" className="inline-flex min-h-11 items-center font-semibold text-navy">
            Forecast
          </Link>
          <Link to="/what-if" className="inline-flex min-h-11 items-center font-semibold text-navy">
            What-if
          </Link>
          <Link to="/scenarios" className="inline-flex min-h-11 items-center font-semibold text-navy">
            Scenarios
          </Link>
          <Link to="/reports" className="inline-flex min-h-11 items-center font-semibold text-navy">
            Reports
          </Link>
        </p>

        <ConfidenceMeter level={weekForecast.confidenceLevel} hint={weekForecast.dataPeriodUsed} />
        <AiAdvicePanel
          payload={buildAiAdviceRequest(store, weekForecast, {
            ...(FORECAST_LEVELS.find((item) => item.horizonDays >= 7) ?? FORECAST_LEVELS[0]),
            horizonDays: 7,
            id: 'compat_7d',
          })}
        />
      </div>
    </details>
  )
}
