import type { RiskCardModel } from '../../lib/dashboardData'
import { formatMmk } from '../../lib/money'

const box = {
  high: 'border-risk bg-risk-bg',
  watch: 'border-watch bg-watch-bg',
  healthy: 'border-healthy bg-healthy-bg',
}

const titleColor = {
  high: 'text-risk',
  watch: 'text-watch-ink',
  healthy: 'text-healthy',
}

export function RiskCard({ risk }: { risk: RiskCardModel }) {
  return (
    <article className={`rounded-lg border p-4 ${box[risk.severity]}`}>
      <h3 className={`text-lg font-bold ${titleColor[risk.severity]}`}>{risk.title}</h3>
      <dl className="mt-3 space-y-2 text-sm text-ink">
        <div>
          <dt className="font-semibold text-navy">What may happen</dt>
          <dd>{risk.whatMayHappen}</dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">When it may happen</dt>
          <dd>{risk.whenItMayHappen}</dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">Expected shortage amount</dt>
          <dd>
            {risk.shortageAmountMmk > 0 ? formatMmk(risk.shortageAmountMmk) : 'None projected'}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">Why it may happen</dt>
          <dd>{risk.why}</dd>
        </div>
        <div>
          <dt className="font-semibold text-navy">Recommended action</dt>
          <dd className="font-medium text-navy">{risk.recommendedAction}</dd>
        </div>
      </dl>
    </article>
  )
}
