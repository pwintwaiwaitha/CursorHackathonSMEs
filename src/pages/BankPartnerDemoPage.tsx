import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { formatCompactMmk } from '../lib/money'
import {
  BANK_VALUE_BULLETS,
  DEFAULT_PARTNER_FILTERS,
  PARTNER_DEMO_BANNER,
  buildPartnerDemoView,
  type PartnerActiveFilter,
  type PartnerConnectionFilter,
  type PartnerDateRange,
  type PartnerDemoFilters,
} from '../lib/partnerDemoMetrics'
import { BUSINESS_TYPES } from '../types/models'
import { DEMO_BUSINESSES } from '../storage/demoMode'

export function BankPartnerDemoPage() {
  const [filters, setFilters] = useState<PartnerDemoFilters>(DEFAULT_PARTNER_FILTERS)
  const view = useMemo(() => buildPartnerDemoView(filters), [filters])
  const kpis = view.kpis

  function patch(next: Partial<PartnerDemoFilters>) {
    setFilters((current) => ({ ...current, ...next }))
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="border-b border-watch bg-watch-bg px-4 py-3">
        <p className="text-center text-base font-semibold text-watch-ink">{PARTNER_DEMO_BANNER}</p>
      </div>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8">
        <div className="flex items-start justify-between gap-3">
          <PageHeader
            title="Bank partner demo"
            subtitle="Aggregated hackathon metrics only. No owner names, phones, accounts, or private records."
          />
          <Link to="/dashboard" className="min-h-11 shrink-0 font-semibold text-navy">
            Owner home
          </Link>
        </div>

        <section className="grid gap-3 rounded-[16px] border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium text-ink">
            Date range
            <select
              className="mt-1 min-h-11 w-full rounded-[14px] border border-line px-3"
              value={filters.dateRange}
              onChange={(event) => patch({ dateRange: event.target.value as PartnerDateRange })}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="365d">Last 12 months</option>
            </select>
          </label>
          <label className="text-sm font-medium text-ink">
            Business type
            <select
              className="mt-1 min-h-11 w-full rounded-[14px] border border-line px-3"
              value={filters.businessType}
              onChange={(event) =>
                patch({
                  businessType:
                    event.target.value === 'all'
                      ? 'all'
                      : (event.target.value as PartnerDemoFilters['businessType']),
                })
              }
            >
              <option value="all">All types</option>
              {BUSINESS_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-ink">
            Connection
            <select
              className="mt-1 min-h-11 w-full rounded-[14px] border border-line px-3"
              value={filters.connection}
              onChange={(event) =>
                patch({ connection: event.target.value as PartnerConnectionFilter })
              }
            >
              <option value="all">All</option>
              <option value="connected">Connected</option>
              <option value="not_connected">Not connected</option>
            </select>
          </label>
          <label className="text-sm font-medium text-ink">
            Activity
            <select
              className="mt-1 min-h-11 w-full rounded-[14px] border border-line px-3"
              value={filters.activity}
              onChange={(event) => patch({ activity: event.target.value as PartnerActiveFilter })}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="text-sm font-medium text-ink">
            Demo scenario
            <select
              className="mt-1 min-h-11 w-full rounded-[14px] border border-line px-3"
              value={filters.demoScenario}
              onChange={(event) =>
                patch({
                  demoScenario:
                    event.target.value === 'all'
                      ? 'all'
                      : (event.target.value as PartnerDemoFilters['demoScenario']),
                })
              }
            >
              <option value="all">All scenarios</option>
              {DEMO_BUSINESSES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.typeLabel}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy">Business Account Adoption</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Connected SME accounts"
              value={String(kpis.connectedAccounts)}
              hint={`Cohort ${view.cohortSize}`}
              tone="healthy"
            />
            <StatCard
              label="Connection growth"
              value={`+${kpis.connectionGrowth}`}
              hint="Versus prior window"
              tone={kpis.connectionGrowth >= 0 ? 'healthy' : 'watch'}
            />
            <StatCard
              label="Connection conversion"
              value={`${kpis.connectionConversionRate}%`}
              tone={kpis.connectionConversionRate >= 50 ? 'healthy' : 'watch'}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy">Deposit Growth</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatCard label="Sales deposited" value={kpis.salesDepositedMmk} tone="healthy" />
            <StatCard label="Emergency reserve deposits" value={kpis.reserveDepositedMmk} tone="healthy" />
            <StatCard
              label="Average active deposit balance"
              value={kpis.averageActiveDepositMmk}
              tone="default"
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy">Digital Payment Activity</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Customer payments received digitally"
              value={String(kpis.digitalCustomerPayments)}
              tone="healthy"
            />
            <StatCard
              label="Supplier payments completed digitally"
              value={String(kpis.digitalSupplierPayments)}
              tone="healthy"
            />
            <StatCard label="Monthly transaction volume" value={kpis.monthlyVolumeMmk} tone="default" />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy">Active SME Relationships</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatCard label="Active SMEs in the last 30 days" value={String(kpis.activeSmes30d)} tone="healthy" />
            <StatCard
              label="Daily check-in engagement"
              value={`${kpis.checkInEngagementRate}%`}
              tone={kpis.checkInEngagementRate >= 40 ? 'healthy' : 'watch'}
            />
            <StatCard
              label="Returning SME owners"
              value={`${kpis.returningOwnerRate}%`}
              tone="healthy"
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy">Voluntary Support Leads</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Merchant QR requests" value={String(kpis.merchantQrRequests)} />
            <StatCard label="Business account requests" value={String(kpis.businessAccountRequests)} />
            <StatCard label="Financial guidance requests" value={String(kpis.financialGuidanceRequests)} />
            <StatCard
              label="Working-capital conversations"
              value={String(kpis.workingCapitalRequests)}
              tone="watch"
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy">Operational Value</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Businesses with organized records"
              value={`${kpis.organizedRecordsRate}%`}
              tone="healthy"
            />
            <StatCard
              label="Forecasted shortages detected early"
              value={String(kpis.shortagesDetectedEarly)}
              tone="watch"
            />
            <StatCard
              label="Estimated reduction in manual collection"
              value={`${kpis.manualCollectionReductionRate}%`}
              tone="healthy"
            />
          </div>
        </section>

        <section className="rounded-[16px] border border-line bg-white p-4">
          <h2 className="text-lg font-semibold text-navy">Adoption and deposit trend</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={view.trend}>
                <CartesianGrid stroke="#dde7e0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'depositsMmk'
                      ? formatCompactMmk(Number(value))
                      : String(value)
                  }
                />
                <Line type="monotone" dataKey="connected" stroke="#237A57" strokeWidth={2} />
                <Line type="monotone" dataKey="depositsMmk" stroke="#174C3C" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[16px] border border-line bg-white p-4">
          <h2 className="text-lg font-semibold text-navy">Value funnel</h2>
          <ol className="mt-3 flex flex-col gap-2 text-base font-semibold text-navy lg:flex-row lg:flex-wrap">
            {view.funnel.map((stage, index) => (
              <li key={stage.id} className="flex items-center gap-2">
                <span className="rounded-[14px] bg-healthy-bg px-3 py-2">
                  {stage.label} · {stage.count}
                </span>
                {index < view.funnel.length - 1 ? <span className="text-muted">→</span> : null}
              </li>
            ))}
          </ol>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={view.funnel}>
                <CartesianGrid stroke="#dde7e0" />
                <XAxis dataKey="label" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2F9368" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[16px] border border-line bg-white p-4">
          <h2 className="text-lg font-semibold text-navy">How SME Mate AI creates bank value</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-ink">
            {BANK_VALUE_BULLETS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
