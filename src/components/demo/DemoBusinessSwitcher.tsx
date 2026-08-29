import { DEMO_BUSINESSES, type DemoBusinessId } from '../../storage/demoMode'
import { useApp } from '../../context/useApp'

export function DemoBusinessSwitcher({
  variant = 'compact',
  tone = 'light',
  onLoaded,
}: {
  variant?: 'compact' | 'full'
  tone?: 'light' | 'dark'
  onLoaded?: () => void
}) {
  const { selectedDemoId, isDemoMode, loadDemoBusiness, resetDemoData } = useApp()

  function select(id: DemoBusinessId) {
    loadDemoBusiness(id)
    onLoaded?.()
  }

  if (variant === 'compact') {
    const selectClass =
      tone === 'dark'
        ? 'border-white/25 bg-navy-dark text-white'
        : 'border-line bg-white text-ink'
    return (
      <label className="block min-w-0">
        <span className="sr-only">Demo business</span>
        <select
          className={`w-full rounded-md border px-2 py-1.5 text-xs ${selectClass}`}
          value={selectedDemoId ?? ''}
          onChange={(event) => {
            const value = event.target.value
            const match = DEMO_BUSINESSES.find((item) => item.id === value)
            if (match) {
              select(match.id)
            }
          }}
        >
          <option value="">Demo shops…</option>
          {DEMO_BUSINESSES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.shortLabel} · {item.recordedDays}d
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {DEMO_BUSINESSES.map((item) => {
          const selected = selectedDemoId === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => select(item.id)}
                className={`w-full rounded-md border px-3 py-2.5 text-left ${
                  selected
                    ? 'border-navy bg-bank-blue-light'
                    : 'border-line bg-white hover:border-navy'
                }`}
              >
                <p className="font-semibold text-navy">
                  {item.shortLabel}
                  <span className="ml-2 text-xs font-medium text-muted">
                    {item.typeLabel} · {item.recordedDays} days
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted">Unlocks {item.unlockLabel}</p>
                <p className="mt-0.5 text-xs text-ink">{item.storyLabel}</p>
              </button>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        className="rounded-md bg-bank-blue-light px-4 py-2 text-sm font-semibold text-navy disabled:bg-page disabled:text-muted"
        disabled={!isDemoMode}
        onClick={() => {
          resetDemoData()
          onLoaded?.()
        }}
      >
        Reset Demo Data
      </button>
    </div>
  )
}
