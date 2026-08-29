import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { AiAdvicePanel } from '../components/forecast/AiAdvicePanel'
import { ConfidenceMeter } from '../components/dashboard/ConfidenceMeter'
import { RiskCard } from '../components/dashboard/RiskCard'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingBlock, LoadingCards } from '../components/ui/LoadingBlock'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { useApp } from '../context/useApp'
import { buildAiAdviceRequest } from '../lib/aiAdvice'
import { buildRiskCards, historicalClosingPoints } from '../lib/dashboardData'
import { formatDisplayDate, formatShortDate, todayIsoDate } from '../lib/dates'
import {
  FORECAST_LEVELS,
  listForecastLevels,
  measureCheckInHistory,
  runForecast,
  unlockExplanation,
} from '../lib/forecastEngine'
import { formatCompactMmk, formatMmk } from '../lib/money'
import type { ScenarioBand } from '../types/models'

const BANDS: ScenarioBand[] = ['optimistic', 'expected', 'pessimistic']

export function ForecastPage() {
  const { store, isReady, loadError, retryLoad } = useApp()
  const today = todayIsoDate()
  const history = measureCheckInHistory(store.checkIns, today)
  const levels = listForecastLevels(history.recordedDays)
  const firstUnlocked = levels.find((item) => item.unlocked)?.level ?? FORECAST_LEVELS[0]
  const [levelId, setLevelId] = useState(firstUnlocked.id)
  const profileId = store.profile?.id
  const [levelProfileId, setLevelProfileId] = useState(profileId)
  if (profileId !== levelProfileId) {
    setLevelProfileId(profileId)
    setLevelId(firstUnlocked.id)
  }
  const selected = FORECAST_LEVELS.find((item) => item.id === levelId) ?? FORECAST_LEVELS[0]

  if (!isReady) {
    return (
      <div className="space-y-4">
        <PageHeader title="Cash forecast" subtitle="Loading forecast engine…" />
        <LoadingCards count={4} />
        <LoadingBlock label="Preparing forecast charts…" />
      </div>
    )
  }

  if (loadError) {
    return (
      <ErrorState title="Could not load forecast" message={loadError} onRetry={retryLoad} />
    )
  }

  let expected
  let optimistic
  let pessimistic
  try {
    expected = runForecast({
      store,
      level: selected,
      startDate: today,
      assumptions: store.scenarios,
      band: 'expected',
    })
    optimistic = runForecast({
      store,
      level: selected,
      startDate: today,
      assumptions: store.scenarios,
      band: 'optimistic',
    })
    pessimistic = runForecast({
      store,
      level: selected,
      startDate: today,
      assumptions: store.scenarios,
      band: 'pessimistic',
    })
  } catch {
    return (
      <ErrorState
        title="Forecast engine failed"
        message="The selected view could not be calculated. Try a shorter horizon or reload saved data."
        onRetry={retryLoad}
      />
    )
  }

  const recorded = historicalClosingPoints(store, 14)
  const byDate = new Map<string, { historical: number | null; expected: number | null; optimistic: number | null; pessimistic: number | null }>()

  for (const row of recorded) {
    byDate.set(row.date, {
      historical: row.historical,
      expected: null,
      optimistic: null,
      pessimistic: null,
    })
  }
  for (const point of expected.points) {
    const current = byDate.get(point.date) ?? {
      historical: null,
      expected: null,
      optimistic: null,
      pessimistic: null,
    }
    current.expected = point.projectedBalanceMmk
    byDate.set(point.date, current)
  }
  for (const point of optimistic.points) {
    const current = byDate.get(point.date)
    if (current) {
      current.optimistic = point.projectedBalanceMmk
    }
  }
  for (const point of pessimistic.points) {
    const current = byDate.get(point.date)
    if (current) {
      current.pessimistic = point.projectedBalanceMmk
    }
  }

  const chartData = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date: formatShortDate(date),
      historical: values.historical,
      expected: values.expected,
      optimistic: values.optimistic,
      pessimistic: values.pessimistic,
    }))

  const risks = expected.locked ? [] : buildRiskCards(store, expected, today)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cash forecast"
        subtitle="Recorded cash is a solid line. Predicted cash is dashed. Longer views stay locked until you have enough Daily Cash Check-ins."
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border border-navy bg-navy px-2.5 py-1 text-xs font-semibold text-white">
          {selected.family}
        </span>
        <span className="text-sm text-muted">{selected.label}</span>
      </div>

      {selected.strategic ? (
        <p className="rounded-md border border-watch bg-watch-bg px-3 py-2 text-sm text-navy">
          10-year and 30-year views are strategic scenarios. They are never guaranteed
          predictions.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {levels.map(({ level, unlocked }) => (
          <button
            key={level.id}
            type="button"
            onClick={() => setLevelId(level.id)}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              levelId === level.id
                ? 'border-bank-blue bg-bank-blue text-white'
                : unlocked
                  ? 'border-line bg-white text-ink'
                  : 'border-line bg-page text-muted'
            }`}
          >
            {level.shortName}
            {unlocked ? '' : ' · locked'}
          </button>
        ))}
      </div>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">What unlocks each view</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {FORECAST_LEVELS.map((level) => {
            const unlocked = history.recordedDays >= level.minRecordedDays
            return (
              <li key={level.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <strong>{level.shortName}</strong>
                  {' · '}
                  {level.family}
                </span>
                <span className={unlocked ? 'text-healthy' : 'text-muted'}>
                  {unlockExplanation(level, history.recordedDays)}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {expected.locked ? (
        <>
          <EmptyState
            title={`${selected.shortName} ${selected.family} is locked`}
            message={expected.unlockRequirement ?? unlockExplanation(selected, history.recordedDays)}
            action={
              <Link to="/check-in" className="rounded-md bg-bank-blue px-4 py-2 text-sm font-semibold text-white">
                Add a Daily Cash Check-in
              </Link>
            }
          />
          <AiAdvicePanel payload={null} locked />
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Predicted closing cash" value={expected.predictedClosingCashMmk} />
            <StatCard
              label="Lowest predicted cash"
              value={expected.lowestPredictedCashMmk}
              tone={expected.lowestPredictedCashMmk < 0 ? 'risk' : 'default'}
            />
            <StatCard
              label="Shortage date"
              value={expected.shortageDate ? formatDisplayDate(expected.shortageDate) : 'None'}
              hint={
                expected.shortageAmountMmk > 0
                  ? formatMmk(expected.shortageAmountMmk)
                  : `${formatDisplayDate(expected.startDate)} – ${formatDisplayDate(expected.endDate)}`
              }
              tone={expected.shortageDate ? 'risk' : 'healthy'}
            />
            <StatCard
              label="View type"
              value={selected.family}
              hint={`${BANDS.length} scenarios: optimistic, expected, pessimistic`}
            />
          </div>

          <ConfidenceMeter level={expected.confidenceLevel} hint={expected.dataPeriodUsed} />

          <AiAdvicePanel
            locked={false}
            payload={buildAiAdviceRequest(store, expected, selected)}
          />

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="font-semibold text-navy">
              Recorded cash and {selected.family.toLowerCase()}
            </h2>
            <p className="mt-1 text-xs text-muted">{expected.disclaimer}</p>
            <p className="mt-1 text-xs text-muted">
              Solid line = recorded check-ins. Dashed lines = predicted {selected.family.toLowerCase()}{' '}
              (optimistic, expected, pessimistic).
            </p>
            {chartData.length === 0 ? (
              <EmptyState title="No chart yet" message="Save check-ins or wait for this view to calculate." />
            ) : (
              <div className="mt-3 h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#DDE7E0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis
                      width={78}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value: number) => formatCompactMmk(value)}
                    />
                    <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="historical"
                      name="Recorded"
                      stroke="#174C3C"
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="expected"
                      name="Expected"
                      stroke="#237A57"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="optimistic"
                      name="Optimistic"
                      stroke="#2F9368"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="pessimistic"
                      name="Pessimistic"
                      stroke="#F2C94C"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-navy">Risks in this view</h2>
            {risks.map((risk) => (
              <RiskCard key={risk.id} risk={risk} />
            ))}
          </section>

          {expected.missingDataWarnings.length > 0 ? (
            <section className="rounded-lg border border-watch bg-watch-bg p-4">
              <h2 className="font-semibold text-watch-ink">Missing-data warnings</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-watch-ink">
                {expected.missingDataWarnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
