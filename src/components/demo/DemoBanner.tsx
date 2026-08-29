import { DemoBadge } from './DemoBadge'

export function DemoBanner() {
  return (
    <div className="text-navy">
      <div className="flex flex-wrap items-center gap-2">
        <DemoBadge />
        <p className="font-semibold">Demonstration data</p>
      </div>
      <p className="mt-1 text-sm text-muted">
        These books are a sample Myanmar shop for judging. Forecasts still use
        the real cash engine. Loading a demo replaces saved shop data in this
        browser.
      </p>
    </div>
  )
}
