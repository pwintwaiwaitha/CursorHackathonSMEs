import type { AppStore } from '../storage/types'
import type { ForecastResult, PreferredLanguage } from '../types/models'
import { getCheckInForDate } from './cashBalance'
import { bilingualLine, type BilingualText } from './checkInCopy'
import { assessCashFlowHealth } from './cashflow'
import {
  derivePayableStatus,
  remainingPayableMmk,
  remainingReceivableMmk,
  deriveReceivableStatus,
  totalUpcomingPayablesMmk,
} from './schedule'
import { reminderTimeReached } from './ownerJourney'

export const NOTIFICATION_TYPES = [
  'overdue',
  'upcoming_bills',
  'cash_risk',
  'missing_checkin',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface OwnerNotification {
  id: NotificationType
  type: NotificationType
  title: BilingualText
  body: BilingualText
  href: string
  actionLabel: BilingualText
}

const COPY = {
  overdueTitle: { en: 'Overdue payments', my: 'ကျော်လွန်ငွေ' },
  overdueBody: {
    en: 'A customer or supplier bill is past due.',
    my: 'ဖောက်သည် သို့မဟုတ် ကုန်သည်ဘီလ် ကျော်လွန်နေသည်။',
  },
  overdueAction: { en: 'Open bills', my: 'ဘီလ်ဖွင့်ရန်' },
  billsTitle: { en: 'Upcoming bills', my: 'လာမည့်ဘီလ်' },
  billsBody: {
    en: 'A supplier bill is due within 7 days.',
    my: '၇ ရက်အတွင်း ပေးရမည့် ကုန်သည်ဘီလ် ရှိသည်။',
  },
  billsAction: { en: 'Review bills', my: 'ဘီလ်စစ်ရန်' },
  riskTitle: { en: 'Cash needs attention', my: 'ငွေကို ဂရုစိုက်ရန်' },
  riskBody: {
    en: 'The forecast shows a cash shortage risk.',
    my: 'ခန့်မှန်းချက်တွင် ငွေပြတ်နိုင်သည်။',
  },
  riskAction: { en: 'See forecast', my: 'ခန့်မှန်းချက်ကြည့်ရန်' },
  missingTitle: { en: 'Today’s record is missing', my: 'ယနေ့စာရင်း မရှိသေး' },
  missingBody: {
    en: 'Add today’s cash in and cash out so the books stay current.',
    my: 'စာရင်းမှန်ရန် ယနေ့ ဝင်ငွေ/ထွက်ငွေ ထည့်ပါ။',
  },
  missingAction: { en: 'Add today’s record', my: 'ယနေ့စာရင်းထည့်ရန်' },
} as const

export function buildOwnerNotifications(options: {
  store: AppStore
  forecast: ForecastResult
  today: string
  reminderTime: string
  now?: Date
}): OwnerNotification[] {
  const { store, forecast, today } = options
  const items: OwnerNotification[] = []

  const overdueReceivable = store.receivables.some(
    (item) =>
      deriveReceivableStatus(item, today) === 'overdue' && remainingReceivableMmk(item) > 0,
  )
  const overduePayable = store.payables.some((item) => {
    const status = derivePayableStatus(item, today)
    return status === 'overdue' && remainingPayableMmk({ ...item, status }) > 0
  })
  if (overdueReceivable || overduePayable) {
    items.push({
      id: 'overdue',
      type: 'overdue',
      title: COPY.overdueTitle,
      body: COPY.overdueBody,
      href: '/payments',
      actionLabel: COPY.overdueAction,
    })
  }

  if (totalUpcomingPayablesMmk(store.payables, today, 7) > 0) {
    items.push({
      id: 'upcoming_bills',
      type: 'upcoming_bills',
      title: COPY.billsTitle,
      body: COPY.billsBody,
      href: '/payments',
      actionLabel: COPY.billsAction,
    })
  }

  const health = assessCashFlowHealth(store, forecast)
  if (
    health.status === 'critical' ||
    health.status === 'at_risk' ||
    forecast.risk === 'high' ||
    Boolean(forecast.shortageDate)
  ) {
    items.push({
      id: 'cash_risk',
      type: 'cash_risk',
      title: COPY.riskTitle,
      body: COPY.riskBody,
      href: '/forecast',
      actionLabel: COPY.riskAction,
    })
  }

  const missingToday = !getCheckInForDate(store, today)
  if (missingToday) {
    items.push({
      id: 'missing_checkin',
      type: 'missing_checkin',
      title: COPY.missingTitle,
      body: COPY.missingBody,
      href: '/check-in',
      actionLabel: COPY.missingAction,
    })
  }

  return items
}

export function shouldPingNotification(
  type: NotificationType,
  reminderTime: string,
  now = new Date(),
): boolean {
  if (type === 'missing_checkin') {
    return reminderTimeReached(reminderTime, now)
  }
  return true
}

export function notificationText(
  item: OwnerNotification,
  language: PreferredLanguage,
): { title: string; body: string; action: string } {
  return {
    title: bilingualLine(item.title, language),
    body: bilingualLine(item.body, language),
    action: bilingualLine(item.actionLabel, language),
  }
}

export function canUseBrowserNotifications(): boolean {
  return typeof Notification !== 'undefined'
}

export async function enableBrowserNotifications(): Promise<boolean> {
  if (!canUseBrowserNotifications()) {
    return false
  }
  if (Notification.permission === 'granted') {
    return true
  }
  if (Notification.permission === 'denied') {
    return false
  }
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function fireBrowserNotification(item: OwnerNotification, language: PreferredLanguage): void {
  if (!canUseBrowserNotifications() || Notification.permission !== 'granted') {
    return
  }
  const text = notificationText(item, language)
  try {
    new Notification(text.title, {
      body: text.body,
      tag: item.type,
    })
  } catch {
    // Some browsers block Notification from insecure contexts.
  }
}
