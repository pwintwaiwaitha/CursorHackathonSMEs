import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AddReserveForm } from '../components/dashboard/QuickActionForms'
import { DemoBusinessSwitcher } from '../components/demo/DemoBusinessSwitcher'
import { LanguageSwitch } from '../components/dashboard/LanguageSwitch'
import { MoneyInput } from '../components/ui/MoneyInput'
import { pickLine } from '../lib/checkInCopy'
import { DASHBOARD_COPY } from '../lib/dashboardCopy'
import { ROUTES } from '../lib/routes'
import { OWNER_DEMO_COPY } from '../storage/ownerDemo'
import { useApp } from '../context/useApp'
import { formatDisplayDate, todayIsoDate } from '../lib/dates'
import { formatMmk } from '../lib/money'
import {
  canUseBrowserNotifications,
  enableBrowserNotifications,
} from '../lib/notifications'
import { loadNotificationPrefs, saveNotificationPrefs } from '../lib/uiStorage'
import { businessProfileSchema, scheduledItemSchema } from '../lib/validation'
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPES,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  LANGUAGE_LABELS,
  PREFERRED_LANGUAGES,
  type CashItemKind,
  type Recurrence,
} from '../types/models'

export function SettingsPage() {
  const {
    store,
    saveProfile,
    addScheduledItem,
    removeScheduledItem,
    resetAllData,
  } = useApp()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const profile = store.profile
  const [profileMessage, setProfileMessage] = useState('')
  const [notifPrefs, setNotifPrefs] = useState(loadNotificationPrefs)
  const [notifMessage, setNotifMessage] = useState('')

  const [schedule, setSchedule] = useState({
    name: '',
    kind: 'outflow' as CashItemKind,
    amountMmk: 0,
    dueDate: todayIsoDate(),
    recurrence: 'monthly' as Recurrence,
    notes: '',
  })
  const [formError, setFormError] = useState('')

  if (!profile) {
    return null
  }
  const language = profile.preferredLanguage

  function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const categories = EXPENSE_CATEGORIES.filter(
      (category) => data.get(`cat-${category}`) === 'on',
    )
    const parsed = businessProfileSchema.safeParse({
      businessName: String(data.get('businessName') ?? ''),
      businessType: String(data.get('businessType') ?? 'shop'),
      startingCashBalanceMmk: Math.trunc(Number(data.get('startingCashBalanceMmk') ?? 0)),
      averageMonthlySalesMmk: Math.trunc(Number(data.get('averageMonthlySalesMmk') ?? 0)),
      employeeCount: Math.trunc(Number(data.get('employeeCount') ?? 0)),
      mainExpenseCategories: categories,
      preferredLanguage: String(data.get('preferredLanguage') ?? 'en'),
    })
    if (!parsed.success) {
      setProfileMessage(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }
    saveProfile(parsed.data)
    setProfileMessage('Business details saved.')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">
          {pickLine({ en: 'Account', my: 'အကောင့်' }, language)}
        </h2>
        {user ? (
          <>
            <p className="mt-2 text-sm text-muted">{user.email}</p>
            <button
              type="button"
              disabled={signingOut}
              className="mt-3 inline-flex min-h-11 items-center rounded-md border border-line px-4 font-semibold text-navy disabled:text-muted"
              onClick={() => {
                if (signingOut) {
                  return
                }
                setSigningOut(true)
                void signOut().finally(() => {
                  setSigningOut(false)
                  navigate(ROUTES.dashboard, { replace: true })
                })
              }}
            >
              {signingOut
                ? pickLine({ en: 'Signing out…', my: 'ထွက်နေသည်…' }, language)
                : pickLine({ en: 'Sign out', my: 'ထွက်မည်' }, language)}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            {pickLine({ en: 'Demo mode does not need an account.', my: 'နမူနာမုဒ်တွင် အကောင့်မလိုပါ။' }, language)}{' '}
            <Link to={ROUTES.login} className="font-semibold text-navy underline">
              {pickLine(OWNER_DEMO_COPY.signInToSync, language)}
            </Link>
          </p>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">{pickLine(DASHBOARD_COPY.language, language)}</h2>
        <div className="mt-3">
          <LanguageSwitch />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">Daily reminder</h2>
        <p className="mt-2 text-base text-muted">
          We only alert for overdue payments, upcoming bills, cash risks, and a missing
          today’s record. Each type is shown once per day.
        </p>
        <label className="mt-4 block max-w-xs">
          <span className="mb-1 block text-base font-medium">Reminder time</span>
          <input
            type="time"
            className="min-h-11 w-full rounded-md border border-line px-3"
            value={notifPrefs.reminderTime}
            onChange={(event) => {
              const next = { ...notifPrefs, reminderTime: event.target.value }
              setNotifPrefs(next)
              saveNotificationPrefs(next)
            }}
          />
        </label>
        <button
          type="button"
          className="mt-3 inline-flex min-h-11 items-center rounded-md bg-bank-blue-light px-4 font-semibold text-navy"
          onClick={() => {
            void enableBrowserNotifications().then((ok) => {
              const next = { ...notifPrefs, browserEnabled: ok }
              setNotifPrefs(next)
              saveNotificationPrefs(next)
              setNotifMessage(
                ok
                  ? 'Phone alerts are on. Saved on this phone.'
                  : canUseBrowserNotifications()
                    ? 'Phone alerts were not allowed. In-app alerts still work.'
                    : 'This browser cannot send phone alerts. In-app alerts still work.',
              )
            })
          }}
        >
          {notifPrefs.browserEnabled ? 'Phone alerts on' : 'Turn on phone alerts'}
        </button>
        {notifMessage ? <p className="mt-2 text-base text-healthy">{notifMessage}</p> : null}
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">Business profile</h2>
        <form onSubmit={saveBusiness} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Business name</span>
            <input
              name="businessName"
              defaultValue={profile.businessName}
              className="w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Business type</span>
            <select
              name="businessType"
              defaultValue={profile.businessType}
              className="w-full rounded-md border border-line px-3 py-2"
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {BUSINESS_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Language</span>
            <select
              name="preferredLanguage"
              defaultValue={profile.preferredLanguage}
              className="w-full rounded-md border border-line px-3 py-2"
            >
              {PREFERRED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {LANGUAGE_LABELS[language]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Starting cash (MMK)</span>
            <input
              name="startingCashBalanceMmk"
              type="number"
              min={0}
              defaultValue={profile.startingCashBalanceMmk}
              className="w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Average monthly sales (MMK)
            </span>
            <input
              name="averageMonthlySalesMmk"
              type="number"
              min={0}
              defaultValue={profile.averageMonthlySalesMmk}
              className="w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Employees</span>
            <input
              name="employeeCount"
              type="number"
              min={0}
              defaultValue={profile.employeeCount}
              className="w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <fieldset className="md:col-span-2">
            <legend className="mb-2 text-sm font-medium">Main expenses</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXPENSE_CATEGORIES.map((category) => (
                <label key={category} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`cat-${category}`}
                    defaultChecked={profile.mainExpenseCategories.includes(category)}
                  />
                  {EXPENSE_CATEGORY_LABELS[category]}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-sm text-muted md:col-span-2">
            {pickLine({ en: 'Currency: MMK (fixed)', my: 'ငွေကြေး: MMK (သတ်မှတ်ပြီး)' }, language)}
          </p>
          <button
            type="submit"
            className="rounded-md bg-bank-blue px-4 py-2 font-semibold text-white"
          >
            Save profile
          </button>
          {profileMessage ? (
            <p className="self-center text-sm text-healthy">{profileMessage}</p>
          ) : null}
        </form>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">Scheduled money in / out</h2>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            const parsed = scheduledItemSchema.safeParse(schedule)
            if (!parsed.success) {
              setFormError(parsed.error.issues[0]?.message ?? 'Check this bill.')
              return
            }
            addScheduledItem(parsed.data)
            setSchedule({
              name: '',
              kind: 'outflow',
              amountMmk: 0,
              dueDate: todayIsoDate(),
              recurrence: 'monthly',
              notes: '',
            })
            setFormError('')
          }}
        >
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Name</span>
            <input
              className="w-full rounded-md border border-line px-3 py-2"
              value={schedule.name}
              onChange={(event) =>
                setSchedule((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Rent, wages, electricity"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Type</span>
            <select
              className="w-full rounded-md border border-line px-3 py-2"
              value={schedule.kind}
              onChange={(event) =>
                setSchedule((current) => ({
                  ...current,
                  kind: event.target.value as CashItemKind,
                }))
              }
            >
              <option value="outflow">Money out</option>
              <option value="inflow">Money in</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Repeat</span>
            <select
              className="w-full rounded-md border border-line px-3 py-2"
              value={schedule.recurrence}
              onChange={(event) =>
                setSchedule((current) => ({
                  ...current,
                  recurrence: event.target.value as Recurrence,
                }))
              }
            >
              <option value="once">One time</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
          </label>
          <MoneyInput
            id="sched-amount"
            label="Amount"
            value={schedule.amountMmk}
            onChange={(amountMmk) =>
              setSchedule((current) => ({ ...current, amountMmk }))
            }
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Next date</span>
            <input
              type="date"
              className="w-full rounded-md border border-line px-3 py-2"
              value={schedule.dueDate}
              onChange={(event) =>
                setSchedule((current) => ({ ...current, dueDate: event.target.value }))
              }
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-bank-blue px-4 py-2 font-semibold text-white"
          >
            Add scheduled item
          </button>
          {formError ? <p className="text-sm text-risk">{formError}</p> : null}
        </form>
        <ul className="mt-4 divide-y divide-line">
          {store.scheduledItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {item.name} · {formatMmk(item.amountMmk)}
                </p>
                <p className="text-muted">
                  {item.kind === 'inflow' ? 'In' : 'Out'} · {item.recurrence} ·{' '}
                  {formatDisplayDate(item.dueDate)}
                </p>
              </div>
              <button
                type="button"
                className="text-risk"
                onClick={() => removeScheduledItem(item.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">{pickLine(DASHBOARD_COPY.emergencyReserve, language)}</h2>
        <div className="mt-3">
          <AddReserveForm language={language} onClose={() => undefined} />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-navy">{pickLine(DASHBOARD_COPY.toCollect, language)}</h2>
        <p className="mt-2 text-sm text-muted">
          {pickLine(
            {
              en: 'Customer collections, supplier bills, and the calendar are on Payments.',
              my: 'ကောက်ခံရန်၊ ပေးရန်နှင့် ပြက္ခဒိန်ကို Payments တွင် ကြည့်ပါ။',
            },
            language,
          )}
        </p>
        <Link
          to={ROUTES.payments}
          className="mt-3 inline-flex min-h-11 rounded-md bg-bank-blue px-4 font-semibold text-white"
        >
          {pickLine({ en: 'Open payments', my: 'ပေးချေမှုဖွင့်ရန်' }, language)}
        </Link>
      </section>

      <section className="rounded-lg border border-watch bg-watch-bg p-4">
        <h2 className="font-semibold text-navy">
          {pickLine({ en: 'Bank partner judge view', my: 'ဘဏ်မိတ်ဖက် တရားသူကြီးမြင်ကွင်း' }, language)}
        </h2>
        <p className="mt-2 text-sm text-watch-ink">
          {pickLine(
            {
              en: 'Synthetic hackathon portfolio only. Not the owner banking page. No real money moves.',
              my: 'hackathon သရုပ်ပြစုစုပေါင်းသာ။ ပိုင်ရှင်ဘဏ်စာမျက်နှာ မဟုတ်။ တကယ့်ငွေ မရွှေ့ပါ။',
            },
            language,
          )}
        </p>
        <Link
          to={ROUTES.bankPartnerDemo}
          className="mt-3 inline-flex min-h-11 rounded-md border border-navy px-4 font-semibold text-navy"
        >
          {pickLine({ en: 'Open bank partner demo', my: 'ဘဏ်မိတ်ဖက် နမူနာဖွင့်ရန်' }, language)}
        </Link>
      </section>

      <section className="rounded-lg border border-mint bg-pale p-4">
        <h2 className="font-semibold text-navy">Demo Mode</h2>
        <p className="mt-2 text-sm text-muted">
          {pickLine(
            {
              en: 'Reload the sample J Clothing books on this phone.',
              my: 'ဤဖုန်းတွင် J Clothing နမူနာစာရင်းကို ပြန်တင်ပါ။',
            },
            language,
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <DemoBusinessSwitcher onLoaded={() => navigate(ROUTES.dashboard)} />
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-md border border-risk px-4 font-semibold text-risk"
            onClick={() => {
              resetAllData()
              navigate(ROUTES.dashboard)
            }}
          >
            Reset all data
          </button>
        </div>
      </section>
    </div>
  )
}
