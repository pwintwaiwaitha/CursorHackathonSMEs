import { endOfWeek, format, parseISO, startOfWeek, subDays } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { useApp } from '../context/useApp'
import { checkInNetMmk } from '../lib/cashflow'
import { formatDisplayDate, todayIsoDate } from '../lib/dates'
import { formatCompactMmk, formatMmk } from '../lib/money'
import type { DailyCashCheckIn } from '../types/models'

function cashIn(row: DailyCashCheckIn): number {
  return (
    row.cashSalesMmk + row.customerDebtCollectedMmk + row.otherCashReceivedMmk
  )
}

function cashOut(row: DailyCashCheckIn): number {
  return (
    row.operatingExpensesMmk +
    row.inventoryPurchasesMmk +
    row.supplierPaymentsMmk +
    row.otherCashPaidMmk
  )
}

function sumCheckIns(rows: DailyCashCheckIn[]) {
  return rows.reduce(
    (acc, row) => ({
      sales: acc.sales + cashIn(row),
      expenses: acc.expenses + cashOut(row),
      net: acc.net + checkInNetMmk(row),
      days: acc.days + 1,
    }),
    { sales: 0, expenses: 0, net: 0, days: 0 },
  )
}

export function ReportsPage() {
  const { store } = useApp()
  const today = parseISO(todayIsoDate())
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const monthKey = format(today, 'yyyy-MM')
  const last14Start = format(subDays(today, 13), 'yyyy-MM-dd')

  const weekRows = store.checkIns.filter((row) => {
    const date = parseISO(row.date)
    return date >= weekStart && date <= weekEnd
  })
  const monthRows = store.checkIns.filter((row) => row.date.startsWith(monthKey))
  const week = sumCheckIns(weekRows)
  const month = sumCheckIns(monthRows)

  const last14 = store.checkIns
    .filter((row) => row.date >= last14Start)
    .map((row) => ({
      date: formatDisplayDate(row.date),
      sales: cashIn(row),
      out: cashOut(row),
    }))

  return (
    <div>
      <PageHeader
        title="Weekly and monthly reports"
        subtitle="These numbers come only from Daily Cash Check-ins you saved."
      />

      <section className="mb-6">
        <h2 className="mb-3 font-semibold text-navy">This week</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Days recorded" value={`${week.days}`} />
          <StatCard label="Money in" value={week.sales} tone="healthy" />
          <StatCard label="Money out" value={week.expenses} tone="watch" />
          <StatCard
            label="Net"
            value={week.net}
            tone={week.net >= 0 ? 'healthy' : 'risk'}
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-semibold text-navy">This month</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Days recorded" value={`${month.days}`} />
          <StatCard label="Money in" value={month.sales} tone="healthy" />
          <StatCard label="Money out" value={month.expenses} tone="watch" />
          <StatCard
            label="Net"
            value={month.net}
            tone={month.net >= 0 ? 'healthy' : 'risk'}
          />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="mb-3 font-semibold text-navy">Last 14 recorded days</h2>
        {last14.length === 0 ? (
          <p className="text-sm text-muted">
            No check-ins yet. Complete a Daily Cash Check-in to build this report.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last14}>
                <CartesianGrid stroke="#DDE7E0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  width={78}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) => formatCompactMmk(value)}
                />
                <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
                <Bar dataKey="sales" name="Money in" fill="#237A57" />
                <Bar dataKey="out" name="Money out" fill="#C0784A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
