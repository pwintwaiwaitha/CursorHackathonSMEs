export function TermTooltip({
  label,
  explanation,
}: {
  label: string
  explanation: string
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        className="touch-target inline-flex items-center justify-center rounded-full text-base font-bold text-navy"
        aria-label={explanation}
        title={explanation}
      >
        ?
      </button>
    </span>
  )
}
