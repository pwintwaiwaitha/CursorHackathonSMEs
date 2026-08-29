export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-lg border border-risk bg-risk-bg p-4">
      <p className="font-semibold text-risk">{title}</p>
      <p className="mt-1 text-sm text-ink">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-3 rounded-md bg-bank-blue px-3 py-2 text-sm font-semibold text-white"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
