export function LoadingBlock({ label = 'Loading shop numbers…' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4" role="status">
      <p className="text-sm font-medium text-navy">{label}</p>
      <div className="mt-3 space-y-2">
        <div className="h-4 animate-pulse rounded bg-bank-blue-light" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-bank-blue-light" />
        <div className="h-32 animate-pulse rounded bg-page" />
      </div>
    </div>
  )
}

export function LoadingCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-lg border border-line bg-white"
        />
      ))}
    </div>
  )
}
