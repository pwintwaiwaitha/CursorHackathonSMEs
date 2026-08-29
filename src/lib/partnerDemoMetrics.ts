import { BUSINESS_TYPES, type BusinessType } from '../types/models'
import {
  DEMO_BUSINESS_IDS,
  type DemoBusinessId,
} from '../storage/demoMode'

export const PARTNER_DEMO_BANNER = 'Synthetic demonstration data'

export const BANK_VALUE_BULLETS = [
  'More business-account adoption',
  'Higher and more stable deposits',
  'Increased digital payment transactions',
  'Stronger SME customer retention',
  'Better owner-consented financial records',
  'Lower manual support and document-collection work',
  'Responsible, owner-requested product opportunities',
] as const

export const PARTNER_FUNNEL_STAGES = [
  { id: 'manual_cash', label: 'Manual cash business' },
  { id: 'account_connected', label: 'Business account connected' },
  { id: 'digital_payments', label: 'Digital payments active' },
  { id: 'deposit_reserve', label: 'Deposit and reserve growth' },
  { id: 'owner_support', label: 'Owner-requested bank support' },
] as const

export type PartnerFunnelId = (typeof PARTNER_FUNNEL_STAGES)[number]['id']

export type PartnerDateRange = '7d' | '30d' | '90d' | '365d'

export type PartnerConnectionFilter = 'all' | 'connected' | 'not_connected'
export type PartnerActiveFilter = 'all' | 'active' | 'inactive'

export interface PartnerDemoFilters {
  dateRange: PartnerDateRange
  businessType: BusinessType | 'all'
  connection: PartnerConnectionFilter
  activity: PartnerActiveFilter
  demoScenario: DemoBusinessId | 'all'
}

export const DEFAULT_PARTNER_FILTERS: PartnerDemoFilters = {
  dateRange: '30d',
  businessType: 'all',
  connection: 'all',
  activity: 'all',
  demoScenario: 'all',
}

export interface SyntheticSmeRecord {
  cohortId: string
  businessType: BusinessType
  demoScenario: DemoBusinessId
  connected: boolean
  active30d: boolean
  connectedOn: string
  salesDepositedMmk: number
  reserveDepositedMmk: number
  depositBalanceMmk: number
  digitalCustomerPayments: number
  digitalSupplierPayments: number
  monthlyVolumeMmk: number
  checkInDays: number
  returningOwner: boolean
  organizedRecords: boolean
  shortageDetectedEarly: boolean
  merchantQrRequests: number
  businessAccountRequests: number
  financialGuidanceRequests: number
  workingCapitalRequests: number
}

export interface PartnerKpis {
  connectedAccounts: number
  connectionGrowth: number
  connectionConversionRate: number
  salesDepositedMmk: number
  reserveDepositedMmk: number
  averageActiveDepositMmk: number
  digitalCustomerPayments: number
  digitalSupplierPayments: number
  monthlyVolumeMmk: number
  activeSmes30d: number
  checkInEngagementRate: number
  returningOwnerRate: number
  merchantQrRequests: number
  businessAccountRequests: number
  financialGuidanceRequests: number
  workingCapitalRequests: number
  organizedRecordsRate: number
  shortagesDetectedEarly: number
  manualCollectionReductionRate: number
}

export interface PartnerDemoView {
  banner: typeof PARTNER_DEMO_BANNER
  illustrative: true
  containsRealCustomerData: false
  kpis: PartnerKpis
  funnel: { id: PartnerFunnelId; label: string; count: number }[]
  valueBullets: typeof BANK_VALUE_BULLETS
  trend: { month: string; connected: number; depositsMmk: number }[]
  cohortSize: number
}

const PII_KEYS =
  /^(owner|name|full_name|phone|mobile|email|account|account_number|account_mask|transaction|address|nrc)$/i

const PHONE_LIKE = /(?:\+?95|09)\d{7,10}/
const PERSON_NAME_LIKE = /\b(u |daw |ko |ma |mg )?[A-Z][a-z]+ [A-Z][a-z]+\b/

export function assertSyntheticOnly(value: unknown, path = 'root'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSyntheticOnly(item, `${path}[${index}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (PII_KEYS.test(key)) {
        throw new Error(`Partner demo metrics must not include PII field ${path}.${key}`)
      }
      assertSyntheticOnly(child, `${path}.${key}`)
    }
    return
  }
  if (typeof value === 'string') {
    if (PHONE_LIKE.test(value) || PERSON_NAME_LIKE.test(value)) {
      throw new Error(`Partner demo metrics must not include PII text at ${path}`)
    }
  }
}

function mulberry32(seed: number): () => number {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const TYPES = BUSINESS_TYPES
const SCENARIOS = DEMO_BUSINESS_IDS

export function buildSyntheticCohort(seed = 20260829): SyntheticSmeRecord[] {
  const random = mulberry32(seed)
  const rows: SyntheticSmeRecord[] = []
  for (let index = 0; index < 48; index += 1) {
    const connected = random() > 0.28
    const active30d = random() > 0.22
    const digital = connected && random() > 0.2
    const growth = connected && random() > 0.25
    rows.push({
      cohortId: `sme-${String(index + 1).padStart(3, '0')}`,
      businessType: TYPES[index % TYPES.length] ?? 'shop',
      demoScenario: SCENARIOS[index % SCENARIOS.length] ?? 'minimart',
      connected,
      active30d,
      connectedOn: (() => {
        const offset = 1 + (index % 80)
        const date = new Date('2026-08-29T00:00:00')
        date.setDate(date.getDate() - offset)
        return date.toISOString().slice(0, 10)
      })(),
      salesDepositedMmk: growth ? 400_000 + Math.round(random() * 2_400_000) : 0,
      reserveDepositedMmk: growth ? 50_000 + Math.round(random() * 350_000) : 0,
      depositBalanceMmk: connected ? 200_000 + Math.round(random() * 3_000_000) : 0,
      digitalCustomerPayments: digital ? 4 + Math.round(random() * 28) : 0,
      digitalSupplierPayments: digital ? 2 + Math.round(random() * 16) : 0,
      monthlyVolumeMmk: digital ? 300_000 + Math.round(random() * 4_000_000) : 0,
      checkInDays: active30d ? 8 + Math.round(random() * 22) : Math.round(random() * 4),
      returningOwner: active30d && random() > 0.35,
      organizedRecords: random() > 0.18,
      shortageDetectedEarly: random() > 0.55,
      merchantQrRequests: random() > 0.7 ? 1 : 0,
      businessAccountRequests: !connected && random() > 0.65 ? 1 : 0,
      financialGuidanceRequests: random() > 0.8 ? 1 : 0,
      workingCapitalRequests: random() > 0.88 ? 1 : 0,
    })
  }
  assertSyntheticOnly(rows)
  return rows
}

function inDateRange(isoDate: string, range: PartnerDateRange): boolean {
  const days =
    range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
  const start = new Date('2026-08-29')
  start.setDate(start.getDate() - days)
  return isoDate >= start.toISOString().slice(0, 10)
}

export function filterSyntheticCohort(
  rows: SyntheticSmeRecord[],
  filters: PartnerDemoFilters,
): SyntheticSmeRecord[] {
  return rows.filter((row) => {
    if (filters.businessType !== 'all' && row.businessType !== filters.businessType) {
      return false
    }
    if (filters.demoScenario !== 'all' && row.demoScenario !== filters.demoScenario) {
      return false
    }
    if (filters.connection === 'connected' && !row.connected) {
      return false
    }
    if (filters.connection === 'not_connected' && row.connected) {
      return false
    }
    if (filters.activity === 'active' && !row.active30d) {
      return false
    }
    if (filters.activity === 'inactive' && row.active30d) {
      return false
    }
    if (row.connected && !inDateRange(row.connectedOn, filters.dateRange)) {
      return filters.connection === 'not_connected'
    }
    return true
  })
}

function rate(part: number, total: number): number {
  if (total <= 0) {
    return 0
  }
  return Math.round((part / total) * 100)
}

export function aggregatePartnerKpis(rows: SyntheticSmeRecord[]): PartnerKpis {
  const connected = rows.filter((row) => row.connected)
  const previousConnected = Math.max(1, connected.length - Math.round(connected.length * 0.12))
  const activeDeposits = connected.filter((row) => row.depositBalanceMmk > 0)
  const depositSum = activeDeposits.reduce((sum, row) => sum + row.depositBalanceMmk, 0)
  return {
    connectedAccounts: connected.length,
    connectionGrowth: connected.length - previousConnected,
    connectionConversionRate: rate(connected.length, rows.length),
    salesDepositedMmk: rows.reduce((sum, row) => sum + row.salesDepositedMmk, 0),
    reserveDepositedMmk: rows.reduce((sum, row) => sum + row.reserveDepositedMmk, 0),
    averageActiveDepositMmk:
      activeDeposits.length === 0 ? 0 : Math.round(depositSum / activeDeposits.length),
    digitalCustomerPayments: rows.reduce((sum, row) => sum + row.digitalCustomerPayments, 0),
    digitalSupplierPayments: rows.reduce((sum, row) => sum + row.digitalSupplierPayments, 0),
    monthlyVolumeMmk: rows.reduce((sum, row) => sum + row.monthlyVolumeMmk, 0),
    activeSmes30d: rows.filter((row) => row.active30d).length,
    checkInEngagementRate: rate(
      rows.filter((row) => row.checkInDays >= 12).length,
      rows.length,
    ),
    returningOwnerRate: rate(rows.filter((row) => row.returningOwner).length, rows.length),
    merchantQrRequests: rows.reduce((sum, row) => sum + row.merchantQrRequests, 0),
    businessAccountRequests: rows.reduce((sum, row) => sum + row.businessAccountRequests, 0),
    financialGuidanceRequests: rows.reduce(
      (sum, row) => sum + row.financialGuidanceRequests,
      0,
    ),
    workingCapitalRequests: rows.reduce((sum, row) => sum + row.workingCapitalRequests, 0),
    organizedRecordsRate: rate(rows.filter((row) => row.organizedRecords).length, rows.length),
    shortagesDetectedEarly: rows.filter((row) => row.shortageDetectedEarly).length,
    manualCollectionReductionRate: rate(
      rows.filter((row) => row.organizedRecords && row.connected).length,
      rows.length,
    ),
  }
}

export function buildPartnerFunnel(rows: SyntheticSmeRecord[]) {
  return PARTNER_FUNNEL_STAGES.map((stage) => {
    const count = rows.filter((row) => {
      if (stage.id === 'manual_cash') {
        return !row.connected
      }
      if (stage.id === 'account_connected') {
        return row.connected
      }
      if (stage.id === 'digital_payments') {
        return row.digitalCustomerPayments + row.digitalSupplierPayments > 0
      }
      if (stage.id === 'deposit_reserve') {
        return row.salesDepositedMmk + row.reserveDepositedMmk > 0
      }
      return (
        row.merchantQrRequests +
          row.businessAccountRequests +
          row.financialGuidanceRequests +
          row.workingCapitalRequests >
        0
      )
    }).length
    return { id: stage.id, label: stage.label, count }
  })
}

const TREND_MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'] as const

export function buildPartnerTrend(kpis: PartnerKpis) {
  return TREND_MONTHS.map((month, index) => ({
    month,
    connected: Math.max(1, Math.round(kpis.connectedAccounts * ((index + 3) / 8))),
    depositsMmk: Math.max(0, Math.round(kpis.salesDepositedMmk * ((index + 2) / 8))),
  }))
}

export function buildPartnerDemoView(filters: PartnerDemoFilters = DEFAULT_PARTNER_FILTERS): PartnerDemoView {
  const cohort = filterSyntheticCohort(buildSyntheticCohort(), filters)
  const kpis = aggregatePartnerKpis(cohort)
  const view: PartnerDemoView = {
    banner: PARTNER_DEMO_BANNER,
    illustrative: true,
    containsRealCustomerData: false,
    kpis,
    funnel: buildPartnerFunnel(cohort),
    valueBullets: BANK_VALUE_BULLETS,
    trend: buildPartnerTrend(kpis),
    cohortSize: cohort.length,
  }
  assertSyntheticOnly(view)
  return view
}
