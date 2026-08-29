import { useEffect, useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import { buildForecast } from '../../lib/cashflow'
import { todayIsoDate } from '../../lib/dates'
import {
  buildOwnerNotifications,
  fireBrowserNotification,
  shouldPingNotification,
  notificationText,
} from '../../lib/notifications'
import {
  loadNotificationPrefs,
  markNotificationShown,
  wasNotificationShownToday,
} from '../../lib/uiStorage'

export function NotificationCenter() {
  const { store } = useApp()
  const language = store.profile?.preferredLanguage ?? 'en'
  const today = todayIsoDate()
  const [open, setOpen] = useState(false)
  const [prefs, setPrefs] = useState(loadNotificationPrefs)

  useEffect(() => {
    const onFocus = () => setPrefs(loadNotificationPrefs())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const forecast = useMemo(
    () => buildForecast(store, 14, store.scenarios, today),
    [store, today],
  )
  const items = useMemo(
    () =>
      buildOwnerNotifications({
        store,
        forecast,
        today,
        reminderTime: prefs.reminderTime,
      }),
    [store, forecast, today, prefs.reminderTime],
  )

  useEffect(() => {
    if (!prefs.browserEnabled) {
      return
    }
    for (const item of items) {
      if (!shouldPingNotification(item.type, prefs.reminderTime)) {
        continue
      }
      if (wasNotificationShownToday(item.type, today)) {
        continue
      }
      fireBrowserNotification(item, language)
      markNotificationShown(item.type, today)
    }
  }, [items, language, prefs.browserEnabled, prefs.reminderTime, today])

  return (
    <div className="relative">
      <button
        type="button"
        className="touch-target relative inline-flex items-center justify-center rounded-md text-navy"
        aria-expanded={open}
        aria-label={`Alerts, ${items.length} waiting`}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={22} />
        {items.length > 0 ? (
          <span className="absolute right-1 top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-risk px-1 text-xs font-bold text-white">
            {items.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-line bg-white p-3 shadow-md">
          <p className="text-base font-semibold text-navy">Alerts</p>
          {items.length === 0 ? (
            <p className="mt-2 text-base text-muted">No cash alerts right now.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {items.map((item) => {
                const text = notificationText(item, language)
                return (
                  <li key={item.id} className="rounded-md border border-line p-3">
                    <p className="font-semibold text-ink">{text.title}</p>
                    <p className="mt-1 text-base text-muted">{text.body}</p>
                    <Link
                      to={item.href}
                      className="mt-2 inline-flex min-h-11 items-center font-semibold text-navy"
                      onClick={() => setOpen(false)}
                    >
                      {text.action}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
