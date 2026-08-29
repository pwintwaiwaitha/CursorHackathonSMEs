import type { BankTransaction } from '../types/bank'

export function availableBusinessAccountBalanceMmk(
  transactions: BankTransaction[],
): number {
  let balance = 0
  for (const item of transactions) {
    const amount = Math.trunc(item.amount)
    if (amount <= 0) {
      continue
    }
    if (item.direction === 'inflow') {
      balance += amount
    } else {
      balance -= amount
    }
  }
  return balance
}

export function emergencyReserveHeldMmk(transactions: BankTransaction[]): number {
  let held = 0
  for (const item of transactions) {
    if (item.category !== 'reserve_transfer') {
      continue
    }
    const amount = Math.trunc(item.amount)
    if (amount <= 0) {
      continue
    }
    if (item.direction === 'inflow') {
      held += amount
    } else {
      held -= amount
    }
  }
  return Math.max(0, held)
}

export function reserveProgressPercent(heldMmk: number, targetMmk: number): number {
  const target = Math.trunc(targetMmk)
  if (target <= 0) {
    return 0
  }
  return Math.min(100, Math.round((Math.max(0, Math.trunc(heldMmk)) / target) * 100))
}

export function resultingCashAfterOutflow(
  currentCashMmk: number,
  amountMmk: number,
): { cashBeforeMmk: number; cashAfterMmk: number; createsShortage: boolean } {
  const cashBeforeMmk = Math.trunc(currentCashMmk)
  const cashAfterMmk = cashBeforeMmk - Math.max(0, Math.trunc(amountMmk))
  return {
    cashBeforeMmk,
    cashAfterMmk,
    createsShortage: cashAfterMmk < 0,
  }
}

export function suggestedReserveMmk(safeToSpendMmk: number): number | null {
  const safe = Math.trunc(safeToSpendMmk)
  if (safe <= 0) {
    return null
  }
  return safe
}

export function safeToSpendAfterReserve(
  safeToSpendMmk: number,
  reserveAmountMmk: number,
): number {
  return Math.max(0, Math.trunc(safeToSpendMmk) - Math.max(0, Math.trunc(reserveAmountMmk)))
}
