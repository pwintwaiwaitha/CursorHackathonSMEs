import { describe, expect, it } from 'vitest'
import { isNavItemActive, MOBILE_NAV_ITEMS, NAV_ITEMS } from './nav'

describe('owner bottom navigation', () => {
  it('has exactly five destinations and no Settings', () => {
    expect(NAV_ITEMS.map((item) => item.to)).toEqual([
      '/dashboard',
      '/check-in',
      '/payments',
      '/forecast',
      '/banking',
    ])
    expect(MOBILE_NAV_ITEMS).toEqual(NAV_ITEMS)
    expect(NAV_ITEMS.some((item) => item.to === '/settings')).toBe(false)
    expect(NAV_ITEMS.some((item) => item.to === '/what-if')).toBe(false)
    expect(NAV_ITEMS.some((item) => item.to === '/scenarios')).toBe(false)
    expect(NAV_ITEMS.some((item) => item.to === '/bank-partner-demo')).toBe(false)
  })

  it('keeps Check-in and Forecast tools highlighted on child routes', () => {
    expect(isNavItemActive('/dashboard', '/dashboard')).toBe(true)
    expect(isNavItemActive('/check-in', '/check-in/history')).toBe(true)
    expect(isNavItemActive('/payments', '/bills')).toBe(true)
    expect(isNavItemActive('/forecast', '/what-if')).toBe(true)
    expect(isNavItemActive('/forecast', '/scenarios')).toBe(true)
    expect(isNavItemActive('/banking', '/bank-partner-demo')).toBe(false)
    expect(isNavItemActive('/dashboard', '/settings')).toBe(false)
  })
})
