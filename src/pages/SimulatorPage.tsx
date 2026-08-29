import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ConfidenceMeter } from '../components/dashboard/ConfidenceMeter'
import { AiAdvicePanel } from '../components/forecast/AiAdvicePanel'
import { ConfirmAction } from '../components/schedule/ConfirmAction'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingBlock, LoadingCards } from '../components/ui/LoadingBlock'
import { MoneyInput } from '../components/ui/MoneyInput'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { useApp } from '../context/useApp'
import { buildAiAdviceRequest, mapEngineRisk } from '../lib/aiAdvice'
import { formatDisplayDate, formatShortDate, todayIsoDate } from '../lib/dates'
import { formatCompactMmk, formatMmk } from '../lib/money'
import { whatIfSchema } from '../lib/validation'
import {
  EMPTY_WHAT_IF,
  WHAT_IF_HORIZONS,
  hasWhatIfChanges,
  runWhatIfSimulation,
  type WhatIfInputs,
} from '../lib/whatIf'
import type { ShortageRisk } from '../types/models'

function riskLabel(risk: ShortageRisk): string {
  if (risk === 'high') {
    return 'High Risk'
  }
  if (risk === 'medium') {
    return 'Watch'
  }
  return 'Healthy'
}

function riskTone(risk: ShortageRisk): 'healthy' | 'watch' | 'risk' {
  if (risk === 'high') {
    return 'risk'
  }
  if (risk === 'medium') {
    return 'watch'
  }
  return 'healthy'
}

export function SimulatorPage({ embedded = false }: { embedded?: boolean }) {
  const { store, isReady, loadError, retryLoad, saveScenarios } = useApp()
  const [draft, setDraft] = useState<WhatIfInputs>(EMPTY_WHAT_IF)
  const [horizonDays, setHorizonDays] = useState<(typeof WHAT_IF_HORIZONS)[number]>(7)
  const [confirmApply, setConfirmApply] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState('')
  const today = todayIsoDate()

  function update<K extends keyof WhatIfInputs>(key: K, value: WhatIfInputs[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setMessage('')
    setConfirmApply(false)
    setConfirmed(false)
  }

  if (!isReady) {
    return (
      <div className="space-y-4">
        <PageHeader title="What-if simulator" subtitle="Loading the cash engine…" />
        <LoadingCards count={4} />
        <LoadingBlock label="Preparing before and after cash paths…" />
      </div>
    )
  }

  if (loadError) {
    return (
      <ErrorState title="Could not load the simulator" message={loadError} onRetry={retryLoad} />
    )
  }

  let simulation
  try {
    simulation = runWhatIfSimulation({
      store,
      draft,
      horizonDays,
      startDate: today,
    })
  } catch {
    return (
      <ErrorState
        title="Simulator failed"
        message="The forecast engine could not compare this change. Try a shorter window."
        onRetry={retryLoad}
      />
    )
  }

  const {
    before,
    afterExpected,
    afterOptimistic,
    afterPessimistic,
    closingCashDifferenceMmk,
    riskBefore,
    riskAfter,
    narrative,
    appliedAssumptions,
    level,
  } = simulation

  const dateSet = new Set(
    [...before.points, ...afterExpected.points, ...afterOptimistic.points, ...afterPessimistic.points].map(
      (point) => point.date,
    ),
  )
  const lineChart = [...dateSet].sort().map((date) => ({
    date: formatShortDate(date),
    before: before.points.find((point) => point.date === date)?.projectedBalanceMmk ?? null,
    after: afterExpected.points.find((point) => point.date === date)?.projectedBalanceMmk ?? null,
    best: afterOptimistic.points.find((point) => point.date === date)?.projectedBalanceMmk ?? null,
    worst: afterPessimistic.points.find((point) => point.date === date)?.projectedBalanceMmk ?? null,
  }))
  const barChart = [
    {
      name: 'Closing cash',
      before: before.predictedClosingCashMmk,
      after: afterExpected.predictedClosingCashMmk,
    },
    {
      name: 'Lowest cash',
      before: before.lowestPredictedCashMmk,
      after: afterExpected.lowestPredictedCashMmk,
    },
  ]
  const advicePayload = buildAiAdviceRequest(store, afterExpected, level)
  const dirty = hasWhatIfChanges(draft)

  function applyPlan() {
    const parsed = whatIfSchema.safeParse(draft)
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Please check the numbers.')
      return
    }
    saveScenarios(appliedAssumptions)
    setMessage('This what-if is now the saved plan. Forecasts will use it.')
    setConfirmApply(false)
    setConfirmed(false)
    setDraft(EMPTY_WHAT_IF)
  }

  return (
    <div className="space-y-5">
      {embedded ? null : (
        <PageHeader
          title="What-if cash-flow simulator"
          subtitle="Try a decision without changing saved books. Example: if I buy 500,000 MMK of stock today, will I have enough cash next week?"
        />
      )}

      <p className="rounded-md border border-watch bg-watch-bg px-3 py-2 text-sm text-navy">
        What-if results are planning estimates, not promises. 10-year and 30-year
        strategic scenarios on Forecast are never guaranteed predictions.
      </p>

      <div className="flex flex-wrap gap-2">
        {WHAT_IF_HORIZONS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setHorizonDays(days)}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              horizonDays === days ? 'border-bank-blue bg-bank-blue text-white' : 'border-line bg-white text-ink'
            }`}
          >
            Next {days} days
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <form
          className="space-y-3 rounded-lg border border-line bg-white p-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <p className="text-sm font-semibold text-navy">Test a decision</p>
          <MoneyInput
            id="stock"
            label="Buy new inventory"
            value={draft.extraStockPurchaseMmk}
            onChange={(value) => update('extraStockPurchaseMmk', value)}
            hint="One-time stock buy today"
          />
          <Slider
            label={`Sales change (${draft.salesChangePercent}%)`}
            min={-50}
            max={80}
            value={draft.salesChangePercent}
            onChange={(value) => update('salesChangePercent', value)}
          />
          <p className="-mt-2 text-xs text-muted">Uses the check-in run-rate on 14-day and 30-day views.</p>
          <Slider
            label={`Expense change (${draft.expenseChangePercent}%)`}
            min={-50}
            max={80}
            value={draft.expenseChangePercent}
            onChange={(value) => update('expenseChangePercent', value)}
          />
          <Slider
            label={`Customer pays ${draft.collectionShiftDays === 0 ? 'on the expected date' : draft.collectionShiftDays < 0 ? `${Math.abs(draft.collectionShiftDays)} days earlier` : `${draft.collectionShiftDays} days later`}`}
            min={-30}
            max={45}
            value={draft.collectionShiftDays}
            onChange={(value) => update('collectionShiftDays', value)}
          />
          <Slider
            label={`Supplier payment postponed (${draft.supplierPostponeDays} days)`}
            min={0}
            max={45}
            value={draft.supplierPostponeDays}
            onChange={(value) => update('supplierPostponeDays', value)}
          />
          <MoneyInput
            id="hire"
            label="Hire an employee (monthly wage)"
            value={draft.hireEmployeeMonthlyWageMmk}
            onChange={(value) => update('hireEmployeeMonthlyWageMmk', value)}
            hint="Added as a daily wage in this window"
          />
          <MoneyInput
            id="branch"
            label="Open a new branch"
            value={draft.newBranchExpansionCostMmk}
            onChange={(value) => update('newBranchExpansionCostMmk', value)}
          />
          <MoneyInput
            id="loan"
            label="Take a planned loan"
            value={draft.plannedLoanMmk}
            onChange={(value) => update('plannedLoanMmk', value)}
            hint="Cash in only if you type an amount. The app does not recommend a loan."
          />
          <MoneyInput
            id="invest"
            label="Make a planned investment"
            value={draft.plannedInvestmentMmk}
            onChange={(value) => update('plannedInvestmentMmk', value)}
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="rounded-md bg-bank-blue-light px-4 py-2 text-sm font-semibold text-navy"
              onClick={() => {
                setDraft(EMPTY_WHAT_IF)
                setMessage('')
                setConfirmApply(false)
                setConfirmed(false)
              }}
            >
              Reset trial
            </button>
            <button
              type="button"
              disabled={!dirty}
              className="rounded-md bg-bank-blue px-4 py-2 text-sm font-semibold text-white disabled:bg-muted"
              onClick={() => {
                const parsed = whatIfSchema.safeParse(draft)
                if (!parsed.success) {
                  setMessage(parsed.error.issues[0]?.message ?? 'Please check the numbers.')
                  return
                }
                setConfirmApply(true)
              }}
            >
              Apply as Plan
            </button>
          </div>
          {confirmApply ? (
            <ConfirmAction
              title="Save this trial as the shop plan?"
              confirmLabel="I understand this will change saved forecast assumptions, not Daily Cash Check-ins."
              confirmed={confirmed}
              onConfirmChange={setConfirmed}
              onCancel={() => {
                setConfirmApply(false)
                setConfirmed(false)
              }}
              onSubmit={applyPlan}
              submitLabel="Apply as Plan"
            >
              <p>
                Closing cash would move by {formatMmk(closingCashDifferenceMmk)}. Books and bills stay
                as they are until you edit them separately.
              </p>
            </ConfirmAction>
          ) : null}
          {message ? <p className="text-sm text-healthy">{message}</p> : null}
          <p className="text-xs text-muted">
            Trials stay on this screen only. Saved data does not change until you choose Apply as Plan.
          </p>
        </form>

        <div className="space-y-4">
          <section className="rounded-lg border border-navy bg-white p-4">
            <h2 className="font-semibold text-navy">What this change means</h2>
            <p className="mt-2 text-lg font-semibold text-ink">{narrative}</p>
            <p className="mt-2 text-xs text-muted">
              Written from the forecast engine numbers. AI does not invent amounts.
            </p>
          </section>

          <ConfidenceMeter
            level={afterExpected.confidenceLevel}
            hint={afterExpected.dataPeriodUsed}
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Cash flow before" value={before.predictedClosingCashMmk} hint="Expected closing, current plan" />
            <StatCard
              label="Cash flow after"
              value={afterExpected.predictedClosingCashMmk}
              hint="Expected closing after this trial"
              tone={afterExpected.predictedClosingCashMmk < 0 ? 'risk' : 'default'}
            />
            <StatCard
              label="Difference in closing cash"
              value={closingCashDifferenceMmk}
              hint={closingCashDifferenceMmk < 0 ? 'Lower than the current plan' : 'Higher or unchanged'}
              tone={closingCashDifferenceMmk < 0 ? 'risk' : closingCashDifferenceMmk > 0 ? 'healthy' : 'default'}
            />
            <StatCard
              label="New shortage date"
              value={afterExpected.shortageDate ? formatDisplayDate(afterExpected.shortageDate) : 'None'}
              hint={
                before.shortageDate
                  ? `Before: ${formatDisplayDate(before.shortageDate)}`
                  : 'No shortage on the current plan'
              }
              tone={afterExpected.shortageDate ? 'risk' : 'healthy'}
            />
            <StatCard
              label="New shortage amount"
              value={afterExpected.shortageAmountMmk}
              hint={
                before.shortageAmountMmk > 0
                  ? `Before: ${formatMmk(before.shortageAmountMmk)}`
                  : 'No shortage on the current plan'
              }
              tone={afterExpected.shortageAmountMmk > 0 ? 'risk' : 'healthy'}
            />
            <StatCard
              label="Risk level change"
              value={`${riskLabel(riskBefore)} → ${riskLabel(riskAfter)}`}
              hint={`After this trial: ${mapEngineRisk(riskAfter)}`}
              tone={riskTone(riskAfter)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Best case"
              value={afterOptimistic.predictedClosingCashMmk}
              hint="Optimistic after the change"
              tone="healthy"
            />
            <StatCard
              label="Expected case"
              value={afterExpected.predictedClosingCashMmk}
              hint="Expected after the change"
            />
            <StatCard
              label="Worst case"
              value={afterPessimistic.predictedClosingCashMmk}
              hint="Pessimistic after the change"
              tone={afterPessimistic.predictedClosingCashMmk < 0 ? 'risk' : 'watch'}
            />
          </div>

          {lineChart.length === 0 ? (
            <EmptyState
              title="No comparison chart yet"
              message="Add a Daily Cash Check-in or bills so the engine has a path to draw."
              action={
                <Link to="/check-in" className="rounded-md bg-bank-blue px-4 py-2 text-sm font-semibold text-white">
                  Daily Cash Check-in
                </Link>
              }
            />
          ) : (
            <>
              <section className="rounded-lg border border-line bg-white p-4">
                <h2 className="mb-3 font-semibold text-navy">Cash flow before versus after</h2>
                <div className="h-56 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChart}>
                      <CartesianGrid stroke="#DDE7E0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis
                        width={78}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value: number) => formatCompactMmk(value)}
                      />
                      <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
                      <Legend />
                      <Line type="monotone" dataKey="before" name="Before" stroke="#66766F" strokeWidth={2} dot={false} />
                      <Line
                        type="monotone"
                        dataKey="after"
                        name="After (expected)"
                        stroke="#237A57"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="best"
                        name="Best"
                        stroke="#2F9368"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="worst"
                        name="Worst"
                        stroke="#F2C94C"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-lg border border-line bg-white p-4">
                <h2 className="mb-3 font-semibold text-navy">Closing and lowest cash</h2>
                <div className="h-52 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChart}>
                      <CartesianGrid stroke="#DDE7E0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        width={78}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value: number) => formatCompactMmk(value)}
                      />
                      <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
                      <Legend />
                      <Bar dataKey="before" name="Before" fill="#66766F" />
                      <Bar dataKey="after" name="After" fill="#237A57" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}

          <AiAdvicePanel payload={advicePayload} />
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
