import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Plus, QrCode, ShieldPlus, Truck } from 'lucide-react'
import { CashHub } from '../components/dashboard/CashHub'
import { FinancialDetails } from '../components/dashboard/FinancialDetails'
import { LanguageSwitch } from '../components/dashboard/LanguageSwitch'
import { QuickActionModal, type QuickModal } from '../components/dashboard/QuickActionForms'
import { SevenDayTimeline } from '../components/dashboard/SevenDayTimeline'
import { TodayActionCenter } from '../components/dashboard/TodayActionCenter'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingBlock, LoadingCards } from '../components/ui/LoadingBlock'
import { NotificationCenter } from '../components/notifications/NotificationCenter'
import { useApp } from '../context/useApp'
import { assessCashFlowHealth, buildForecast, getCheckInForDate, getCurrentCashMmk } from '../lib/cashflow'
import { bilingualLine, pickLine } from '../lib/checkInCopy'
import { DASHBOARD_COPY } from '../lib/dashboardCopy'
import { expenseCategoryChartData, historicalClosingPoints } from '../lib/dashboardData'
import {
  buildSevenDayTimeline,
  buildTodayActionItems,
  cashHubStatus,
  computeCashCover,
  computeSafeToSpend,
  latestBooksUpdatedAt,
  lowestIn14Days,
  visibleTodayActions,
} from '../lib/dashboardMetrics'
import { formatDisplayDate, formatShortDate, todayIsoDate } from '../lib/dates'
import { measureCheckInHistory } from '../lib/forecastEngine'
import { formatSavedAt } from '../lib/ownerJourney'
import { totalOpenReceivablesMmk } from '../lib/schedule'
import {
  loadCompletedActionIds,
  loadHideAmounts,
  loadLastUpdatedDisplay,
  markActionCompleted,
  saveHideAmounts,
  saveLastUpdatedDisplay,
} from '../lib/uiStorage'

export function DashboardPage() {
  const { store, isReady, loadError, retryLoad } = useApp()
  const today = todayIsoDate()
  const language = store.profile?.preferredLanguage ?? 'en'
  const [hideAmounts, setHideAmounts] = useState(loadHideAmounts)
  const [completedIds, setCompletedIds] = useState(() => loadCompletedActionIds(today))
  const [modal, setModal] = useState<QuickModal>(null)

  useEffect(() => {
    const stamp = latestBooksUpdatedAt(store, loadLastUpdatedDisplay() ?? undefined)
    saveLastUpdatedDisplay(stamp)
  }, [store])

  if (!isReady) {
    return (
      <div className="space-y-4">
        <LoadingCards count={2} />
        <LoadingBlock />
      </div>
    )
  }

  if (loadError) {
    return (
      <ErrorState title="Could not load dashboard" message={loadError} onRetry={retryLoad} />
    )
  }

  let weekForecast
  let health
  let forecast14
  try {
    getCurrentCashMmk(store)
    weekForecast = buildForecast(store, 7, store.scenarios, today)
    forecast14 = buildForecast(store, 14, store.scenarios, today)
    health = assessCashFlowHealth(store, forecast14)
  } catch {
    return (
      <ErrorState
        title="Dashboard numbers failed"
        message="Cash figures could not be calculated from the saved books. Try reloading."
        onRetry={retryLoad}
      />
    )
  }

  const sts = computeSafeToSpend(store, today)
  const hubStatus = cashHubStatus(forecast14, health)
  const cashCover = computeCashCover(store)
  const recordedDays = measureCheckInHistory(store.checkIns, today).recordedDays
  const lowest = lowestIn14Days(forecast14, recordedDays)
  const todayCheckIn = getCheckInForDate(store, today)
  const actions = visibleTodayActions(buildTodayActionItems(store, today), new Set(completedIds))
  const timeline = buildSevenDayTimeline(store, weekForecast, today)
  const updatedAt = latestBooksUpdatedAt(store)
  const lastUpdatedLabel = formatSavedAt(updatedAt, language)
  const history = historicalClosingPoints(store, 14)
  const balanceChart = [
    ...history.map((row) => ({
      date: formatShortDate(row.date),
      historical: row.historical,
      forecast: null as number | null,
    })),
    ...weekForecast.points.map((point, index) => ({
      date: formatShortDate(point.date),
      historical: index === 0 && history.length === 0 ? weekForecast.startingBalanceMmk : null,
      forecast: point.projectedBalanceMmk,
    })),
  ]
  const flowChart = weekForecast.points.map((point) => ({
    date: formatShortDate(point.date),
    inflows: point.inflowsMmk,
    outflows: point.outflowsMmk,
  }))
  const expenses = expenseCategoryChartData(store)
  const hasBooks =
    store.checkIns.length > 0 || store.receivables.length > 0 || store.payables.length > 0
  const ctaLabel = todayCheckIn
    ? bilingualLine(DASHBOARD_COPY.editToday, language)
    : bilingualLine(DASHBOARD_COPY.addToday, language)

  const quick = [
    {
      id: 'sale',
      label: pickLine(DASHBOARD_COPY.recordSale, language),
      icon: Banknote,
      onClick: () => setModal('sale'),
    },
    {
      id: 'qr',
      label: pickLine(DASHBOARD_COPY.receiveQr, language),
      icon: QrCode,
      href: '/receive-qr',
    },
    {
      id: 'pay',
      label: pickLine(DASHBOARD_COPY.paySupplier, language),
      icon: Truck,
      onClick: () => setModal('pay'),
    },
    {
      id: 'reserve',
      label: pickLine(DASHBOARD_COPY.addReserve, language),
      icon: ShieldPlus,
      onClick: () => setModal('reserve'),
    },
  ] as const

  return (
    <div className="space-y-3 pb-20 lg:pb-0">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-navy">
            {store.profile?.businessName ?? 'SME Mate AI'}
          </p>
          <p className="text-base text-muted">{formatDisplayDate(today)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationCenter />
          <LanguageSwitch />
        </div>
      </header>

      <CashHub
        language={language}
        sts={sts}
        status={hubStatus}
        confidence={weekForecast.confidenceLevel}
        lastUpdatedLabel={lastUpdatedLabel}
        hideAmounts={hideAmounts}
        onToggleHide={() => {
          const next = !hideAmounts
          setHideAmounts(next)
          saveHideAmounts(next)
        }}
      />

      <section>
        <h2 className="sr-only">{pickLine(DASHBOARD_COPY.quickActions, language)}</h2>
        <div className="grid grid-cols-2 gap-2">
          {quick.map((item) => {
            const Icon = item.icon
            const className =
              'touch-target flex items-center justify-center gap-2 rounded-[14px] border border-line bg-white px-3 text-base font-semibold text-navy'
            if ('href' in item) {
              return (
                <Link key={item.id} to={item.href} className={className}>
                  <Icon size={20} />
                  {item.label}
                </Link>
              )
            }
            return (
              <button key={item.id} type="button" className={className} onClick={item.onClick}>
                <Icon size={20} />
                {item.label}
              </button>
            )
          })}
        </div>
      </section>

      <Link
        to="/check-in"
        className="hidden min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-navy px-4 text-base font-bold text-white lg:flex"
      >
        <Plus size={20} />
        {ctaLabel}
      </Link>

      {!hasBooks ? (
        <EmptyState
          title={pickLine(DASHBOARD_COPY.homeTitle, language)}
          message={bilingualLine(DASHBOARD_COPY.noBooks, language)}
        />
      ) : null}

      <TodayActionCenter
        language={language}
        items={actions}
        hideAmounts={hideAmounts}
        onComplete={(id) => setCompletedIds(markActionCompleted(today, id))}
      />

      <SevenDayTimeline language={language} days={timeline} hideAmounts={hideAmounts} />

      <FinancialDetails
        store={store}
        language={language}
        hideAmounts={hideAmounts}
        cashCover={cashCover}
        lowest={lowest}
        health={health}
        totalReceivablesMmk={totalOpenReceivablesMmk(store.receivables)}
        weekForecast={weekForecast}
        balanceChart={balanceChart}
        flowChart={flowChart}
        expenses={expenses}
      />

      <Link
        to="/check-in"
        className="fixed inset-x-3 bottom-16 z-30 flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-navy px-4 text-base font-bold text-white shadow-md lg:hidden"
      >
        <Plus size={20} />
        {ctaLabel}
      </Link>

      <QuickActionModal kind={modal} language={language} onClose={() => setModal(null)} />
    </div>
  )
}
