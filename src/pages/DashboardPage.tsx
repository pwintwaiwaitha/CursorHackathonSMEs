import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { BankingTeaser } from '../components/banking/BankingTeaser'
import { HomeBalanceStrip } from '../components/dashboard/HomeBalanceStrip'
import { HomeBestAction } from '../components/dashboard/HomeBestAction'
import { HomeSafeToSpend } from '../components/dashboard/HomeSafeToSpend'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingBlock, LoadingCards } from '../components/ui/LoadingBlock'
import { useApp } from '../context/useApp'
import { useBanking } from '../hooks/useBanking'
import { assessCashFlowHealth, buildForecast, getCheckInForDate } from '../lib/cashflow'
import { CHECK_IN_COPY, pickLine } from '../lib/checkInCopy'
import { DASHBOARD_COPY } from '../lib/dashboardCopy'
import {
  buildSevenDayTimeline,
  buildTodayActionItems,
  computeSafeToSpend,
  latestBooksUpdatedAt,
  visibleTodayActions,
} from '../lib/dashboardMetrics'
import { todayIsoDate } from '../lib/dates'
import { mapOwnerStatus } from '../lib/ownerJourney'
import { ROUTES } from '../lib/routes'
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
  const banking = useBanking()
  const location = useLocation()
  const today = todayIsoDate()
  const language = store.profile?.preferredLanguage ?? 'en'
  const bankTransactions = banking.isConnected ? banking.snapshot.transactions : []
  const checkInSaved = Boolean(
    location.state &&
      typeof location.state === 'object' &&
      'checkInSaved' in location.state &&
      location.state.checkInSaved,
  )
  const [hideAmounts, setHideAmounts] = useState(loadHideAmounts)
  const [completedIds, setCompletedIds] = useState(() => loadCompletedActionIds(today))

  useEffect(() => {
    const stamp = latestBooksUpdatedAt(store, loadLastUpdatedDisplay() ?? undefined)
    saveLastUpdatedDisplay(stamp)
  }, [store])

  if (!isReady) {
    return (
      <div className="space-y-2">
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
    weekForecast = buildForecast(store, 7, store.scenarios, today, bankTransactions)
    forecast14 = buildForecast(store, 14, store.scenarios, today, bankTransactions)
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
  const ownerStatus = mapOwnerStatus(health, forecast14)
  const todayCheckIn = getCheckInForDate(store, today)
  const bestAction = visibleTodayActions(
    buildTodayActionItems(store, today),
    new Set(completedIds),
  )[0] ?? null
  const timeline = buildSevenDayTimeline(store, weekForecast, today)
  const hasBooks =
    store.checkIns.length > 0 || store.receivables.length > 0 || store.payables.length > 0
  const ctaLabel = todayCheckIn
    ? pickLine(DASHBOARD_COPY.editToday, language)
    : pickLine(DASHBOARD_COPY.addToday, language)

  return (
    <div className="space-y-2 pb-20 lg:pb-0">
      {checkInSaved ? (
        <p className="rounded-md bg-healthy-bg px-3 py-3 text-base font-medium text-healthy" role="status">
          {pickLine(CHECK_IN_COPY.saved, language)}
        </p>
      ) : null}
      <HomeSafeToSpend
        language={language}
        sts={sts}
        status={ownerStatus}
        hideAmounts={hideAmounts}
        shortageDate={forecast14.shortageDate}
        shortageAmountMmk={forecast14.shortageAmountMmk}
        onToggleHide={() => {
          const next = !hideAmounts
          setHideAmounts(next)
          saveHideAmounts(next)
        }}
      />

      <BankingTeaser
        language={language}
        hideAmounts={hideAmounts}
        emergencyReserveMmk={sts.emergencyReserveMmk}
      />

      <HomeBestAction
        language={language}
        item={bestAction}
        hideAmounts={hideAmounts}
        onComplete={(id) => setCompletedIds(markActionCompleted(today, id))}
      />

      <Link
        to={ROUTES.checkIn}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-navy px-4 text-base font-bold text-white"
      >
        <Plus size={20} />
        {ctaLabel}
      </Link>

      {!hasBooks ? (
        <EmptyState
          title={pickLine(DASHBOARD_COPY.homeTitle, language)}
          message={pickLine(DASHBOARD_COPY.noBooks, language)}
        />
      ) : null}

      <HomeBalanceStrip language={language} days={timeline} hideAmounts={hideAmounts} />
    </div>
  )
}
