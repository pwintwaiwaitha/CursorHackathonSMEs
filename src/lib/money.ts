const MMK = 'MMK'

export function parseIntegerMmk(raw: string): number {
  const digits = raw.replace(/[^\d-]/g, '')
  if (digits === '' || digits === '-') {
    return 0
  }
  const value = Number.parseInt(digits, 10)
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.trunc(value)
}

export function formatMmk(amount: number): string {
  const safe = Math.trunc(amount)
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.abs(safe))
  const sign = safe < 0 ? '-' : ''
  return `${sign}${formatted} ${MMK}`
}

export function formatCompactMmk(amount: number): string {
  const safe = Math.trunc(amount)
  const abs = Math.abs(safe)
  const sign = safe < 0 ? '-' : ''
  if (abs >= 100_000_000) {
    return `${sign}${Math.round(abs / 1_000_000)}m ${MMK}`
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}m ${MMK}`
  }
  if (abs >= 100_000) {
    return `${sign}${Math.round(abs / 1_000)}k ${MMK}`
  }
  return formatMmk(safe)
}

export function applyPercent(amountMmk: number, percentChange: number): number {
  return Math.round((amountMmk * (100 + percentChange)) / 100)
}
