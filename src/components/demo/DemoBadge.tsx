export function DemoBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-watch bg-watch-bg font-semibold uppercase tracking-wide text-watch-ink ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
    >
      Demo
    </span>
  )
}
