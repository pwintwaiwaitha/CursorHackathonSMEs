import { useState } from 'react'
import type { WhyPredictionModel } from '../../lib/aiAdvice'

export function WhyPrediction({ why }: { why: WhyPredictionModel }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        className="rounded-md bg-bank-blue-light px-4 py-2 text-sm font-semibold text-navy"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Why this prediction?
      </button>
      {open ? (
        <div className="mt-3 space-y-3 rounded-lg border border-line bg-white p-4 text-sm">
          <section>
            <h3 className="font-semibold text-navy">Data used</h3>
            <p className="mt-1 text-ink">{why.dataUsed}</p>
          </section>
          <section>
            <h3 className="font-semibold text-navy">Forecast method</h3>
            <p className="mt-1 text-ink">{why.forecastMethod}</p>
          </section>
          <section>
            <h3 className="font-semibold text-navy">Main assumptions</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-ink">
              {why.mainAssumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-navy">Missing data</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-ink">
              {why.missingData.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-navy">Confidence level</h3>
            <p className="mt-1 text-ink">{why.confidenceLevel}</p>
          </section>
        </div>
      ) : null}
    </div>
  )
}
