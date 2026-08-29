import { useNavigate } from 'react-router-dom'
import { CheckInHistoryList } from '../components/check-in/CheckInHistoryList'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingCards } from '../components/ui/LoadingBlock'
import { useApp } from '../context/useApp'
import { CHECK_IN_COPY, pickLine } from '../lib/checkInCopy'
import { ROUTES } from '../lib/routes'

export function CheckInHistoryPage() {
  const { store, isReady, loadError, retryLoad, deleteCheckIn } = useApp()
  const navigate = useNavigate()
  const language = store.profile?.preferredLanguage ?? 'en'

  if (!isReady) {
    return <LoadingCards count={2} />
  }

  if (loadError) {
    return <ErrorState title="Could not load history" message={loadError} onRetry={retryLoad} />
  }

  function onDelete(id: string) {
    const ok = window.confirm(pickLine(CHECK_IN_COPY.deleteConfirm, language))
    if (!ok) {
      return
    }
    deleteCheckIn(id)
  }

  return (
    <CheckInHistoryList
      language={language}
      checkIns={store.checkIns}
      selectedDate=""
      onEdit={(date) => navigate(`${ROUTES.checkIn}?date=${date}`)}
      onDelete={onDelete}
    />
  )
}
