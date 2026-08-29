import type { BankTransaction, BankTransactionDirection } from '../types/bank'
import type { AppStore } from '../storage/types'
import type { Payable, Receivable } from '../types/models'
import { remainingPayableMmk, remainingReceivableMmk } from './schedule'

export type BankMatchStatus = 'matched' | 'unmatched'

export interface MatchableMovement {
  id: string
  businessId: string
  date: string
  amountMmk: number
  direction: BankTransactionDirection
  reference: string
}

export interface BankMatchPair {
  bankTransactionId: string
  manualId: string
  businessId: string
  date: string
  amountMmk: number
  direction: BankTransactionDirection
  reference: string
  status: 'matched'
}

export function normalizeBankReference(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function bankMatchKey(item: MatchableMovement): string {
  return [
    item.businessId,
    item.date,
    Math.trunc(item.amountMmk),
    item.direction,
    normalizeBankReference(item.reference),
  ].join('|')
}

export function movementsMatch(left: MatchableMovement, right: MatchableMovement): boolean {
  return bankMatchKey(left) === bankMatchKey(right)
}

export function matchableFromBankTransaction(
  item: BankTransaction,
  businessId: string,
): MatchableMovement {
  return {
    id: item.id,
    businessId,
    date: item.transaction_date,
    amountMmk: Math.trunc(item.amount),
    direction: item.direction,
    reference: item.description ?? item.external_transaction_id,
  }
}

export function matchableFromReceivable(
  item: Receivable,
  businessId: string,
): MatchableMovement | null {
  const amountMmk = remainingReceivableMmk(item)
  if (amountMmk <= 0) {
    return null
  }
  return {
    id: item.id,
    businessId,
    date: item.expectedPaymentDate,
    amountMmk,
    direction: 'inflow',
    reference: item.customerName,
  }
}

export function matchableFromPayable(
  item: Payable,
  businessId: string,
): MatchableMovement | null {
  const amountMmk = remainingPayableMmk(item)
  if (amountMmk <= 0) {
    return null
  }
  return {
    id: item.id,
    businessId,
    date: item.dueDate,
    amountMmk,
    direction: 'outflow',
    reference: item.supplierName,
  }
}

/**
 * Deterministic 1:1 matching. Never uses an LLM.
 * Same business, date, amount, direction, and normalized reference = one pair.
 */
export function matchBankToManual(
  bank: MatchableMovement[],
  manuals: MatchableMovement[],
): BankMatchPair[] {
  const remaining = new Map<string, MatchableMovement[]>()
  for (const manual of manuals) {
    const key = bankMatchKey(manual)
    const list = remaining.get(key) ?? []
    list.push(manual)
    remaining.set(key, list)
  }
  const pairs: BankMatchPair[] = []
  for (const item of [...bank].sort((a, b) => a.id.localeCompare(b.id))) {
    const list = remaining.get(bankMatchKey(item))
    const partner = list?.shift()
    if (!partner) {
      continue
    }
    pairs.push({
      bankTransactionId: item.id,
      manualId: partner.id,
      businessId: item.businessId,
      date: item.date,
      amountMmk: item.amountMmk,
      direction: item.direction,
      reference: normalizeBankReference(item.reference),
      status: 'matched',
    })
  }
  return pairs
}

export function matchStatusForBankTransaction(
  transactionId: string,
  pairs: BankMatchPair[],
): BankMatchStatus {
  return pairs.some((item) => item.bankTransactionId === transactionId)
    ? 'matched'
    : 'unmatched'
}

export function matchedManualIds(pairs: BankMatchPair[]): Set<string> {
  return new Set(pairs.map((item) => item.manualId))
}

export function buildBankMatchPairs(
  store: AppStore,
  transactions: BankTransaction[],
  businessId: string,
): BankMatchPair[] {
  const bank = transactions.map((item) => matchableFromBankTransaction(item, businessId))
  const manuals = [
    ...store.receivables
      .map((item) => matchableFromReceivable(item, businessId))
      .filter((item): item is MatchableMovement => item !== null),
    ...store.payables
      .map((item) => matchableFromPayable(item, businessId))
      .filter((item): item is MatchableMovement => item !== null),
  ]
  return matchBankToManual(bank, manuals)
}

/**
 * Reuses the existing forecast engine: drop manuals already represented by a bank txn.
 */
export function storeWithoutMatchedManuals(
  store: AppStore,
  transactions: BankTransaction[],
  businessId: string,
): AppStore {
  const matched = matchedManualIds(buildBankMatchPairs(store, transactions, businessId))
  if (matched.size === 0) {
    return store
  }
  return {
    ...store,
    receivables: store.receivables.filter((item) => !matched.has(item.id)),
    payables: store.payables.filter((item) => !matched.has(item.id)),
  }
}

export function isBankConnectionActive(
  connection: { status: string; consent_given: boolean } | null | undefined,
): boolean {
  return Boolean(connection && connection.status === 'connected' && connection.consent_given)
}
