import type { DemoBusinessId } from '../storage/demoMode'
import type {
  BankAction,
  BankActionType,
  BankConnection,
  BankSupportRequest,
  BankSupportRequestType,
  BankTransaction,
} from '../types/bank'
import type { BankIsolation } from '../lib/bankIsolation'

export interface BankSnapshot {
  isolation: BankIsolation
  demoBusinessId: DemoBusinessId | null
  connection: BankConnection | null
  transactions: BankTransaction[]
  actions: BankAction[]
  supportRequests: BankSupportRequest[]
}

export interface ConfirmBankActionInput {
  actionType: BankActionType
  amountMmk: number | null
  purpose: string
  idempotencyKey: string
  linkedReceivableId?: string
  linkedPayableId?: string
  supportType?: BankSupportRequestType
  ownerConsent?: boolean
  ownerMessage?: string
  paymentReference?: string
  reserveDirection?: 'save' | 'use'
}

export interface ConfirmBankActionResult {
  ok: boolean
  replayed: boolean
  message: string
  action?: BankAction
  transaction?: BankTransaction | null
  supportRequest?: BankSupportRequest | null
  markReceivableId?: string
  markPayableId?: string
  plannedOnly?: boolean
}

export function emptyBankSnapshot(isolation: BankIsolation): BankSnapshot {
  return {
    isolation,
    demoBusinessId: null,
    connection: null,
    transactions: [],
    actions: [],
    supportRequests: [],
  }
}
