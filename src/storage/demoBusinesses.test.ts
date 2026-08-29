import { describe, expect, it } from 'vitest'
import {
  FORECAST_LEVELS,
  isForecastLevelUnlocked,
  measureCheckInHistory,
  runForecast,
} from '../lib/forecastEngine'
import { deriveReceivableStatus } from '../lib/schedule'
import { todayIsoDate } from '../lib/dates'
import {
  advertisedLevelsForDays,
  DEMO_BUSINESSES,
  type DemoBusinessId,
} from './demoMode'
import { buildDemoStore } from './demoBusinesses'
import { EMPTY_SCENARIOS } from './types'

const asOf = todayIsoDate()

const EXPECTED_DAYS: Record<DemoBusinessId, number> = {
  cafe: 1,
  online: 7,
  minimart: 30,
  bakery: 180,
  clothing: 365,
  wholesale: 1095,
}

describe('demo business seeds', () => {
  it('records the advertised number of Daily Cash Check-in days', () => {
    for (const meta of DEMO_BUSINESSES) {
      const store = buildDemoStore(meta.id, asOf)
      const history = measureCheckInHistory(store.checkIns, asOf)
      expect(history.recordedDays, meta.id).toBe(EXPECTED_DAYS[meta.id])
      expect(history.recordedDays, meta.id).toBe(meta.recordedDays)
    }
  })

  it('unlocks the advertised forecast family for each seed', () => {
    for (const meta of DEMO_BUSINESSES) {
      const store = buildDemoStore(meta.id, asOf)
      const recordedDays = measureCheckInHistory(store.checkIns, asOf).recordedDays
      const advertised = advertisedLevelsForDays(meta.recordedDays)

      expect(advertised.length, meta.id).toBeGreaterThan(0)
      for (const level of advertised) {
        expect(isForecastLevelUnlocked(level, recordedDays), `${meta.id} ${level.id}`).toBe(
          true,
        )
        const result = runForecast({
          store,
          level,
          startDate: asOf,
        })
        expect(result.locked, `${meta.id} ${level.id}`).toBe(false)
      }

      const nextLocked = FORECAST_LEVELS.find(
        (level) => recordedDays < level.minRecordedDays,
      )
      if (nextLocked) {
        const locked = runForecast({
          store,
          level: nextLocked,
          startDate: asOf,
        })
        expect(locked.locked, `${meta.id} ${nextLocked.id}`).toBe(true)
      }
    }
  })

  it('projects a shortage from seed inputs on a short horizon', () => {
    const store = buildDemoStore('online', asOf)
    const shortHorizon = FORECAST_LEVELS[0]
    const result = runForecast({
      store,
      level: shortHorizon,
      startDate: asOf,
    })
    expect(result.locked).toBe(false)
    expect(result.shortageDate).toBeTruthy()
    expect(result.shortageAmountMmk).toBeGreaterThan(0)
  })

  it('marks at least one bakery receivable overdue with the real status helper', () => {
    const store = buildDemoStore('bakery', asOf)
    const overdue = store.receivables.filter(
      (item) => deriveReceivableStatus(item, asOf) === 'overdue',
    )
    expect(overdue.length).toBeGreaterThan(0)
    expect(overdue.some((item) => item.expectedPaymentDate < asOf)).toBe(true)
  })

  it('keeps the new café healthy on the 3-day scheduled forecast', () => {
    const store = buildDemoStore('cafe', asOf)
    const result = runForecast({
      store,
      level: FORECAST_LEVELS[0],
      startDate: asOf,
    })
    expect(result.locked).toBe(false)
    expect(result.shortageDate).toBeNull()
    expect(result.shortageAmountMmk).toBe(0)
  })

  it('rechains check-ins with integer MMK and the real cash formula', () => {
    const store = buildDemoStore('minimart', asOf)
    const starting = store.profile?.startingCashBalanceMmk ?? 0
    expect(store.checkIns[0]?.openingCashMmk).toBe(starting)
    for (let index = 1; index < store.checkIns.length; index += 1) {
      expect(store.checkIns[index].openingCashMmk).toBe(
        store.checkIns[index - 1].closingCashMmk,
      )
    }
    for (const item of store.checkIns) {
      const amounts = [
        item.openingCashMmk,
        item.cashSalesMmk,
        item.customerDebtCollectedMmk,
        item.creditSalesMmk,
        item.operatingExpensesMmk,
        item.inventoryPurchasesMmk,
        item.supplierPaymentsMmk,
        item.otherCashReceivedMmk,
        item.otherCashPaidMmk,
        item.closingCashMmk,
      ]
      expect(amounts.every((value) => Number.isInteger(value))).toBe(true)
    }
  })

  it('includes current scenario fields including what-if extras', () => {
    const store = buildDemoStore('wholesale', asOf)
    for (const key of Object.keys(EMPTY_SCENARIOS) as (keyof typeof EMPTY_SCENARIOS)[]) {
      expect(store.scenarios[key], key).toEqual(expect.any(Number))
    }
    expect(store.scenarios.supplierPostponeDays).toBeGreaterThanOrEqual(0)
    expect(store.scenarios.hireEmployeeMonthlyWageMmk).toBeGreaterThanOrEqual(0)
  })

  it('ties mini-mart cash to heavy stock buying', () => {
    const store = buildDemoStore('minimart', asOf)
    const sales = store.checkIns.reduce((sum, item) => sum + item.cashSalesMmk, 0)
    const stockOut = store.checkIns.reduce(
      (sum, item) => sum + item.inventoryPurchasesMmk + item.supplierPaymentsMmk,
      0,
    )
    expect(stockOut).toBeGreaterThan(sales * 0.55)
    expect(
      store.payables.filter((item) => item.category === 'stock').length,
    ).toBeGreaterThan(0)
  })
})
