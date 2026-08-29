import { useApp } from '../context/useApp'
import { useBanking } from '../hooks/useBanking'
import { BankingSection } from '../components/banking/BankingSection'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingBlock, LoadingCards } from '../components/ui/LoadingBlock'
import { PageHeader } from '../components/ui/PageHeader'
import { buildForecast, getCheckInForDate, getCurrentCashMmk } from '../lib/cashflow'
import { computeSafeToSpend } from '../lib/dashboardMetrics'
import { todayIsoDate } from '../lib/dates'
import { pickLine } from '../lib/checkInCopy'
import { BANK_COPY } from '../lib/bankCopy'

export function BankingPage() {
  const { store, isReady, loadError, retryLoad } = useApp()
  const banking = useBanking()
  const today = todayIsoDate()
  const language = store.profile?.preferredLanguage ?? 'en'

  if (!isReady) {
    return (
      <div className="space-y-4">
        <PageHeader title={pickLine(BANK_COPY.sectionTitle, language)} />
        <LoadingCards count={2} />
        <LoadingBlock />
      </div>
    )
  }

  if (loadError) {
    return <ErrorState title="Could not load banking" message={loadError} onRetry={retryLoad} />
  }

  const sts = computeSafeToSpend(store, today)
  const todayCheckIn = getCheckInForDate(store, today)
  const forecast = buildForecast(
    store,
    14,
    store.scenarios,
    today,
    banking.isConnected ? banking.snapshot.transactions : [],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title={pickLine(BANK_COPY.sectionTitle, language)}
        subtitle={pickLine(BANK_COPY.neverAuto, language)}
      />
      <BankingSection
        language={language}
        hideAmounts={false}
        currentCashMmk={getCurrentCashMmk(store)}
        safeToSpendMmk={sts.safeToSpendMmk}
        todaySalesMmk={todayCheckIn?.cashSalesMmk ?? 0}
        receivables={store.receivables}
        payables={store.payables}
        hasPredictedShortage={Boolean(forecast.shortageDate)}
        shortageDate={forecast.shortageDate}
        shortageAmountMmk={forecast.shortageAmountMmk}
        gapCause={sts.gapCause}
        businessName={store.profile?.businessName ?? 'Thiri Fashion'}
        reserveTargetMmk={store.scenarios.emergencyCashReserveTargetMmk}
      />
    </div>
  )
}
