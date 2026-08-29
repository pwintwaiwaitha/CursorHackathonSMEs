import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/useApp'
import { bilingualLine, pickLine } from '../lib/checkInCopy'
import { DASHBOARD_COPY } from '../lib/dashboardCopy'
import { parseIntegerMmk } from '../lib/money'
import { MoneyInput } from '../components/ui/MoneyInput'

export function ReceiveQrPage() {
  const { store } = useApp()
  const language = store.profile?.preferredLanguage ?? 'en'
  const businessName = store.profile?.businessName ?? 'SME Mate AI'
  const [params, setParams] = useSearchParams()
  const [copied, setCopied] = useState(false)
  const amountMmk = parseIntegerMmk(params.get('amount') ?? '0')

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const deepLink = `${origin}/receive-qr${amountMmk > 0 ? `?amount=${amountMmk}` : ''}`
  const note = useMemo(() => {
    const amountLine = amountMmk > 0 ? `${amountMmk} MMK` : 'amount to confirm'
    return [
      businessName,
      `Please pay ${amountLine}`,
      'Wave Money / KBZ Pay / cash at the shop',
      deepLink,
    ].join('\n')
  }, [amountMmk, businessName, deepLink])

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(note)}`

  async function copyNote() {
    try {
      await navigator.clipboard.writeText(note)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  async function shareNote() {
    if (navigator.share) {
      try {
        await navigator.share({ title: businessName, text: note, url: deepLink })
        return
      } catch {
        // Fall through to copy.
      }
    }
    await copyNote()
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold text-navy">
        {pickLine(DASHBOARD_COPY.qrTitle, language)}
      </h1>
      <p className="text-base text-ink">{bilingualLine(DASHBOARD_COPY.qrHint, language)}</p>
      <p className="text-lg font-semibold text-navy">{businessName}</p>

      <div className="flex justify-center rounded-[16px] border border-line bg-white p-4">
        <img
          src={qrSrc}
          width={220}
          height={220}
          alt={`${businessName} payment QR`}
          className="h-[220px] w-[220px] rounded-[14px] bg-white"
        />
      </div>

      <MoneyInput
        id="qr-amount"
        language={language}
        label={DASHBOARD_COPY.amountToCollect}
        value={amountMmk}
        onChange={(value) => {
          const next = new URLSearchParams(params)
          if (value > 0) {
            next.set('amount', String(value))
          } else {
            next.delete('amount')
          }
          setParams(next, { replace: true })
        }}
      />

      <pre className="whitespace-pre-wrap rounded-[16px] border border-line bg-pale p-3 text-base text-ink">
        {note}
      </pre>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="touch-target rounded-[14px] bg-navy px-4 font-semibold text-white"
          onClick={() => void copyNote()}
        >
          {copied
            ? pickLine(DASHBOARD_COPY.copied, language)
            : pickLine(DASHBOARD_COPY.copyNote, language)}
        </button>
        <button
          type="button"
          className="touch-target rounded-[14px] border border-navy px-4 font-semibold text-navy"
          onClick={() => void shareNote()}
        >
          {pickLine(DASHBOARD_COPY.shareNote, language)}
        </button>
      </div>

      <Link
        to="/"
        className="inline-flex min-h-11 items-center font-semibold text-navy"
      >
        {pickLine(DASHBOARD_COPY.homeTitle, language)}
      </Link>
    </div>
  )
}
