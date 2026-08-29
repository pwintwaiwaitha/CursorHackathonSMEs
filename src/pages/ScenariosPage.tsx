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
import { formatDisplayDate, formatShortDate, todayIsoDate } from '../lib/dates'
import {
  FORECAST_LEVELS,
  measureCheckInHistory,
  runForecast,
} from '../lib/forecastEngine'
import { formatCompactMmk, formatMmk } from '../lib/money'
import { scenarioSchema } from '../lib/validation'
import { EMPTY_SCENARIOS } from '../storage/types'
import { CONFIDENCE_LABELS, type ScenarioAssumptions, type ScenarioBand } from '../types/models'

const BANDS: ScenarioBand[] = ['optimistic', 'expected', 'pessimistic']

export function ScenariosPage({ embedded = false }: { embedded?: boolean }) {
  const { store, saveScenarios } = useApp()
  const [form, setForm] = useState<ScenarioAssumptions>({
    ...EMPTY_SCENARIOS,
    ...store.scenarios,
  })
  const [message, setMessage] = useState('')
  const profileId = store.profile?.id
  const [formProfileId, setFormProfileId] = useState(profileId)
  if (profileId !== formProfileId) {
    setFormProfileId(profileId)
    setForm({
      ...EMPTY_SCENARIOS,
      ...store.scenarios,
    })
  }
  const today = todayIsoDate()
  const recordedDays = measureCheckInHistory(store.checkIns, today).recordedDays
  const unlocked = [...FORECAST_LEVELS]
    .reverse()
    .find((level) => level.usesGrowth && recordedDays >= level.minRecordedDays)
  const fallback = FORECAST_LEVELS.find((level) => recordedDays >= level.minRecordedDays)
  const level = unlocked ?? fallback ?? FORECAST_LEVELS[0]

  const results = BANDS.map((band) =>
    runForecast({
      store,
      level,
      startDate: today,
      assumptions: form,
      band,
      ignoreUnlock: false,
    }),
  )
  const expected = results[1]
  const dateSet = new Set(results.flatMap((item) => item.points.map((point) => point.date)))
  const chartData = [...dateSet].sort().map((date) => {
    function valueAt(index: number): number {
      const point = results[index].points.find((row) => row.date === date)
      return point?.projectedBalanceMmk ?? 0
    }
    return {
      date: formatShortDate(date),
      optimistic: valueAt(0),
      expected: valueAt(1),
      pessimistic: valueAt(2),
    }
  })

  function update<K extends keyof ScenarioAssumptions>(
    key: K,
    value: ScenarioAssumptions[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function onSave() {
    const parsed = scenarioSchema.safeParse(form)
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Please check the numbers.')
      return
    }
    saveScenarios(parsed.data)
    setMessage('Assumptions saved. Forecasts now use this plan.')
  }

  return (
    <div>
      {embedded ? (
        <p className="mb-4 text-sm text-muted">
          Long-term views are scenario projections, not guaranteed predictions.
        </p>
      ) : (
        <PageHeader
          title="Long-term scenarios"
          subtitle="Optimistic, expected and pessimistic paths use the same books. They are planning estimates, not promises."
        />
      )}

      {level.strategic ? (
        <p className="mb-4 rounded-md border border-watch bg-watch-bg px-3 py-2 text-sm text-watch-ink">
          10-year and 30-year views are strategic scenarios. They are never guaranteed
          predictions.
        </p>
      ) : null}

      <p className="mb-4 text-sm text-muted">
        Showing {level.label}
        {expected.locked ? ` — ${expected.unlockRequirement}` : ''}.
      </p>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <form
          className="space-y-3 rounded-lg border border-line bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSave()
          }}
        >
          <Slider
            label={`Near-term sales change (${form.salesChangePercent}%)`}
            min={-50}
            max={80}
            value={form.salesChangePercent}
            onChange={(value) => update('salesChangePercent', value)}
          />
          <Slider
            label={`Near-term expense change (${form.expenseChangePercent}%)`}
            min={-50}
            max={80}
            value={form.expenseChangePercent}
            onChange={(value) => update('expenseChangePercent', value)}
          />
          <Slider
            label={`Customer payment shift (${form.collectionDelayDays} days)`}
            min={-30}
            max={45}
            value={form.collectionDelayDays}
            onChange={(value) => update('collectionDelayDays', value)}
          />
          <Slider
            label={`Supplier payment postpone (${form.supplierPostponeDays} days)`}
            min={0}
            max={45}
            value={form.supplierPostponeDays}
            onChange={(value) => update('supplierPostponeDays', value)}
          />
          <Slider
            label={`Revenue growth (${form.revenueGrowthRatePercent}% / year)`}
            min={-20}
            max={40}
            value={form.revenueGrowthRatePercent}
            onChange={(value) => update('revenueGrowthRatePercent', value)}
          />
          <Slider
            label={`Expense growth (${form.expenseGrowthRatePercent}% / year)`}
            min={-20}
            max={40}
            value={form.expenseGrowthRatePercent}
            onChange={(value) => update('expenseGrowthRatePercent', value)}
          />
          <Slider
            label={`Inflation (${form.inflationRatePercent}% / year)`}
            min={0}
            max={30}
            value={form.inflationRatePercent}
            onChange={(value) => update('inflationRatePercent', value)}
          />
          <Slider
            label={`Customer collection rate (${form.customerCollectionRatePercent}%)`}
            min={0}
            max={100}
            value={form.customerCollectionRatePercent}
            onChange={(value) => update('customerCollectionRatePercent', value)}
          />
          <NumberField
            label="Extra stock purchase (MMK)"
            value={form.extraStockPurchaseMmk}
            onChange={(value) => update('extraStockPurchaseMmk', value)}
          />
          <NumberField
            label="New employee monthly wage (MMK)"
            value={form.hireEmployeeMonthlyWageMmk}
            onChange={(value) => update('hireEmployeeMonthlyWageMmk', value)}
          />
          <NumberField
            label="Planned investment (MMK)"
            value={form.plannedInvestmentMmk}
            onChange={(value) => update('plannedInvestmentMmk', value)}
          />
          <NumberField
            label="Planned loan (MMK)"
            value={form.plannedLoanMmk}
            onChange={(value) => update('plannedLoanMmk', value)}
          />
          <NumberField
            label="New branch expansion cost (MMK)"
            value={form.newBranchExpansionCostMmk}
            onChange={(value) => update('newBranchExpansionCostMmk', value)}
          />
          <NumberField
            label="Emergency cash reserve target (MMK)"
            value={form.emergencyCashReserveTargetMmk}
            onChange={(value) => update('emergencyCashReserveTargetMmk', value)}
          />
          <button
            type="submit"
            className="w-full rounded-md bg-bank-blue px-4 py-2 font-semibold text-white"
          >
            Save assumptions
          </button>
          {message ? <p className="text-sm text-healthy">{message}</p> : null}
        </form>

        <div className="space-y-4">
          {expected.locked ? (
            <p className="rounded-lg border border-line bg-white p-4 text-sm text-muted">
              Save more Daily Cash Check-ins to unlock longer scenario projections.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {results.map((item) => (
                  <StatCard
                    key={item.scenarioBand ?? item.label}
                    label={item.scenarioBand ?? 'Plan'}
                    value={item.predictedClosingCashMmk}
                    hint={`Lowest ${formatMmk(item.lowestPredictedCashMmk)}`}
                    tone={item.lowestPredictedCashMmk < 0 ? 'risk' : 'default'}
                  />
                ))}
              </div>
              <p className="text-xs text-muted">
                {formatDisplayDate(expected.startDate)} to{' '}
                {formatDisplayDate(expected.endDate)}. Confidence:{' '}
                {CONFIDENCE_LABELS[expected.confidenceLevel]}. {expected.disclaimer}
              </p>
              <section className="rounded-lg border border-line bg-white p-4">
                <h2 className="mb-3 font-semibold text-navy">Scenario comparison</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#DDE7E0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis
                        width={78}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value: number) => formatCompactMmk(value)}
                      />
                      <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
                      <Legend />
                      <Line type="monotone" dataKey="optimistic" name="Optimistic" stroke="#2F9368" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="expected" name="Expected" stroke="#237A57" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="pessimistic" name="Pessimistic" stroke="#F2C94C" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        type="number"
        min={0}
        className="w-full rounded-md border border-line px-3 py-2"
        value={value}
        onChange={(event) => onChange(Math.trunc(Number(event.target.value) || 0))}
      />
    </label>
  )
}
