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
import { formatShortDate, todayIsoDate } from '../lib/dates'
import { formatCompactMmk, formatMmk } from '../lib/money'
import { scenarioSchema } from '../lib/validation'
import { EMPTY_SCENARIOS } from '../storage/types'
import type { ScenarioAssumptions } from '../types/models'

export function ScenariosPage() {
  const { store, saveScenarios } = useApp()
  const [form, setForm] = useState<ScenarioAssumptions>(store.scenarios)
  const [message, setMessage] = useState('')

  const baseline = buildForecast(store, 30, EMPTY_SCENARIOS, todayIsoDate())
  const planned = buildForecast(store, 30, form, todayIsoDate())
  const chartData = baseline.points.map((point, index) => ({
    date: formatShortDate(point.date),
    now: point.projectedBalanceMmk,
    plan: planned.points[index]?.projectedBalanceMmk ?? 0,
  }))

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
    setMessage('Plan saved. Dashboard and forecast now use this what-if plan.')
  }

  return (
    <div>
      <PageHeader
        title="Long-term scenarios"
        subtitle="Compare the next 30 days if sales, costs, collections or stock buying change."
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <form
          className="space-y-4 rounded-lg border border-line bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSave()
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Sales change ({form.salesChangePercent}%)
            </span>
            <input
              type="range"
              min={-80}
              max={80}
              value={form.salesChangePercent}
              onChange={(event) =>
                update('salesChangePercent', Number(event.target.value))
              }
              className="w-full"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Expense change ({form.expenseChangePercent}%)
            </span>
            <input
              type="range"
              min={-80}
              max={80}
              value={form.expenseChangePercent}
              onChange={(event) =>
                update('expenseChangePercent', Number(event.target.value))
              }
              className="w-full"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Customer payment delay (days)
            </span>
            <input
              type="number"
              min={0}
              max={90}
              className="w-full rounded-md border border-line px-3 py-2"
              value={form.collectionDelayDays}
              onChange={(event) =>
                update(
                  'collectionDelayDays',
                  Math.trunc(Number(event.target.value) || 0),
                )
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Extra stock buy now (MMK)
            </span>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-line px-3 py-2"
              value={form.extraStockPurchaseMmk}
              onChange={(event) =>
                update(
                  'extraStockPurchaseMmk',
                  Math.trunc(Number(event.target.value) || 0),
                )
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Extra loan / family cash in (MMK)
            </span>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-line px-3 py-2"
              value={form.extraLoanInflowMmk}
              onChange={(event) =>
                update(
                  'extraLoanInflowMmk',
                  Math.trunc(Number(event.target.value) || 0),
                )
              }
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-navy px-4 py-2 font-semibold text-white"
          >
            Save this plan
          </button>
          {message ? <p className="text-sm text-healthy">{message}</p> : null}
        </form>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="If nothing changes"
              value={baseline.lowestBalanceMmk}
              hint="Lowest cash in 30 days"
            />
            <StatCard
              label="If this plan happens"
              value={planned.lowestBalanceMmk}
              hint="Lowest cash in 30 days"
              tone={planned.lowestBalanceMmk < 0 ? 'risk' : 'healthy'}
            />
          </div>
          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 font-semibold text-navy">30-day comparison</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#d5dee8" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    width={78}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value: number) => formatCompactMmk(value)}
                  />
                  <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="now"
                    name="Current path"
                    stroke="#0b3d6e"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="plan"
                    name="This plan"
                    stroke="#1a7f4c"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="font-semibold text-navy">Plan notes</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
              {planned.causes.slice(0, 4).map((cause) => (
                <li key={cause}>{cause}</li>
              ))}
              {planned.recommendedActions.slice(0, 2).map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
