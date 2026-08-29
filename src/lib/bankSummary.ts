import type { BankTransaction } from '../types/bank'
import type { Payable, Receivable } from '../types/models'
import { availableBusinessAccountBalanceMmk, emergencyReserveHeldMmk } from './bankBalance'
import { formatMmk } from './money'
import { remainingPayableMmk, remainingReceivableMmk } from './schedule'

export function demoPaymentDetails(options: {
  businessName: string
  accountMask: string | null
  reference: string
}): string {
  const mask = options.accountMask ? `•••• ${options.accountMask}` : '••••'
  return [
    options.businessName,
    'Demo Bank',
    `Account ${mask}`,
    `Reference ${options.reference}`,
    'Demonstration only — not a real bank transfer.',
  ].join('\n')
}

export function demoFinancialSummary(options: {
  businessName: string
  currentCashMmk: number
  safeToSpendMmk: number
  availableBalanceMmk: number
  reserveHeldMmk: number
  shortageDate: string | null
  shortageAmountMmk: number
  receivables: Receivable[]
  payables: Payable[]
  transactions: BankTransaction[]
}): string {
  const openReceivables = options.receivables.reduce(
    (sum, item) => sum + remainingReceivableMmk(item),
    0,
  )
  const openPayables = options.payables.reduce(
    (sum, item) => sum + remainingPayableMmk(item),
    0,
  )
  return [
    `Financial summary for ${options.businessName}`,
    'Synthetic demonstration — not a loan application or credit decision.',
    `Shop cash: ${formatMmk(options.currentCashMmk)}`,
    `Safe to Spend: ${formatMmk(options.safeToSpendMmk)}`,
    `Demo bank available: ${formatMmk(options.availableBalanceMmk || availableBusinessAccountBalanceMmk(options.transactions))}`,
    `Emergency reserve held: ${formatMmk(options.reserveHeldMmk || emergencyReserveHeldMmk(options.transactions))}`,
    `Open receivables: ${formatMmk(openReceivables)}`,
    `Open payables: ${formatMmk(openPayables)}`,
    options.shortageDate
      ? `Predicted shortage: ${formatMmk(options.shortageAmountMmk)} on ${options.shortageDate}`
      : 'Predicted shortage: none in this view',
  ].join('\n')
}
