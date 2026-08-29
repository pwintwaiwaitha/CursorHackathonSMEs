import { describe, expect, it } from 'vitest'
import {
  APP_REDIRECTS,
  AUTH_REQUIRED_PATHS,
  isAuthRequiredPath,
  pageTitleForPath,
  resolveRedirect,
  ROUTES,
} from './routes'

describe('app redirects', () => {
  it('keeps the required destination map', () => {
    expect(APP_REDIRECTS).toEqual([
      { from: '/', to: '/dashboard' },
      { from: '/bills', to: '/payments' },
      { from: '/simulator', to: '/forecast?tab=what-if' },
      { from: '/what-if', to: '/forecast?tab=what-if' },
      { from: '/scenarios', to: '/forecast?tab=scenarios' },
    ])
    expect(resolveRedirect('/')).toBe('/dashboard')
    expect(resolveRedirect('/bills')).toBe('/payments')
    expect(resolveRedirect('/simulator')).toBe('/forecast?tab=what-if')
    expect(resolveRedirect('/what-if')).toBe('/forecast?tab=what-if')
    expect(resolveRedirect('/scenarios')).toBe('/forecast?tab=scenarios')
    expect(resolveRedirect('/forecast')).toBeNull()
  })

  it('exposes the stable owner routes', () => {
    expect(ROUTES.dashboard).toBe('/dashboard')
    expect(ROUTES.checkIn).toBe('/check-in')
    expect(ROUTES.checkInHistory).toBe('/check-in/history')
    expect(ROUTES.payments).toBe('/payments')
    expect(ROUTES.forecast).toBe('/forecast')
    expect(ROUTES.whatIf).toBe('/what-if')
    expect(ROUTES.scenarios).toBe('/scenarios')
    expect(ROUTES.banking).toBe('/banking')
    expect(ROUTES.settings).toBe('/settings')
    expect(ROUTES.bankPartnerDemo).toBe('/bank-partner-demo')
  })
})

describe('auth-required paths', () => {
  it('protects owner money pages including new IA paths', () => {
    expect(AUTH_REQUIRED_PATHS).toContain('/dashboard')
    expect(AUTH_REQUIRED_PATHS).toContain('/payments')
    expect(isAuthRequiredPath('/dashboard')).toBe(true)
    expect(isAuthRequiredPath('/payments')).toBe(true)
    expect(isAuthRequiredPath('/check-in/history')).toBe(true)
    expect(isAuthRequiredPath('/bills')).toBe(true)
  })
})

describe('page titles', () => {
  it('uses selected-language titles for the five destinations', () => {
    expect(pageTitleForPath('/dashboard').en).toBe('Home')
    expect(pageTitleForPath('/check-in').en).toBe('Check-in')
    expect(pageTitleForPath('/payments').en).toBe('Payments')
    expect(pageTitleForPath('/forecast').en).toBe('Forecast')
    expect(pageTitleForPath('/banking').en).toBe('Banking')
    expect(pageTitleForPath('/check-in/history').en).toBe('Check-in history')
  })
})
