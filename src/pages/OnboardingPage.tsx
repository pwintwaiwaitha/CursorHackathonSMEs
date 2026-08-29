import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../context/useApp'
import { DemoBusinessSwitcher } from '../components/demo/DemoBusinessSwitcher'
import { LoadingBlock } from '../components/ui/LoadingBlock'
import { MoneyInput } from '../components/ui/MoneyInput'
import { businessProfileSchema } from '../lib/validation'
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPES,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  LANGUAGE_LABELS,
  PREFERRED_LANGUAGES,
  type BusinessType,
  type ExpenseCategory,
  type PreferredLanguage,
} from '../types/models'

interface FormState {
  businessName: string
  businessType: BusinessType
  startingCashBalanceMmk: number
  averageMonthlySalesMmk: number
  employeeCount: string
  mainExpenseCategories: ExpenseCategory[]
  preferredLanguage: PreferredLanguage
}

function emptyForm(): FormState {
  return {
    businessName: '',
    businessType: 'shop',
    startingCashBalanceMmk: 0,
    averageMonthlySalesMmk: 0,
    employeeCount: '1',
    mainExpenseCategories: ['rent', 'stock'],
    preferredLanguage: 'en',
  }
}

export function OnboardingPage() {
  const { store, saveProfile, isReady } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fieldErrors = useMemo(() => errors, [errors])

  if (!user || store.profile) {
    return <Navigate to="/dashboard" replace />
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-page px-4 py-8">
        <LoadingBlock label="Loading…" />
      </div>
    )
  }

  function toggleCategory(category: ExpenseCategory) {
    setForm((current) => {
      const has = current.mainExpenseCategories.includes(category)
      return {
        ...current,
        mainExpenseCategories: has
          ? current.mainExpenseCategories.filter((item) => item !== category)
          : [...current.mainExpenseCategories, category],
      }
    })
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = businessProfileSchema.safeParse({
      ...form,
      employeeCount: Number.parseInt(form.employeeCount, 10) || 0,
    })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!next[key]) {
          next[key] = issue.message
        }
      }
      setErrors(next)
      return
    }
    saveProfile(parsed.data)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-page px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-bank-blue">
          SME Mate AI
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">
          Set up your cash-flow copilot
        </h1>
        <p className="mt-2 text-muted">
          Tell us about your shop once. Then do a short Daily Cash Check-in and
          we will show if money may run short.
        </p>
        {user ? (
          <p className="mt-3 rounded-md bg-bank-blue-light px-3 py-2 text-sm text-navy">
            Signed in as {user.email}. Confirmed cash records save to your
            account. Demo shops stay on this phone only.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-navy underline">
              Sign in
            </Link>
            {' · '}
            <Link to="/signup" className="font-semibold text-navy underline">
              Create account
            </Link>
          </p>
        )}

        <section className="mt-6 rounded-lg border border-watch bg-watch-bg p-4">
          <h2 className="font-semibold text-navy">Try Thiri Fashion demo</h2>
          <p className="mt-1 text-sm text-muted">
            Load sample Thiri Fashion books on this phone. Reset is in Settings.
          </p>
          <div className="mt-3">
            <DemoBusinessSwitcher
              onLoaded={() => navigate('/dashboard', { replace: true })}
            />
          </div>
        </section>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-5 rounded-lg border border-line bg-white p-5 shadow-sm"
        >
          <label className="block" htmlFor="businessName">
            <span className="mb-1 block text-sm font-medium">Business name</span>
            <input
              id="businessName"
              className="w-full rounded-md border border-line px-3 py-2"
              value={form.businessName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  businessName: event.target.value,
                }))
              }
              placeholder="Example: Mya Family Mini Mart"
            />
            {fieldErrors.businessName ? (
              <span className="mt-1 block text-xs text-risk">
                {fieldErrors.businessName}
              </span>
            ) : null}
          </label>

          <label className="block" htmlFor="businessType">
            <span className="mb-1 block text-sm font-medium">Business type</span>
            <select
              id="businessType"
              className="w-full rounded-md border border-line px-3 py-2"
              value={form.businessType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  businessType: event.target.value as BusinessType,
                }))
              }
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {BUSINESS_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          <MoneyInput
            id="startingCash"
            label="Starting cash balance"
            value={form.startingCashBalanceMmk}
            onChange={(startingCashBalanceMmk) =>
              setForm((current) => ({ ...current, startingCashBalanceMmk }))
            }
            hint="Cash in hand and in the shop box today."
            error={fieldErrors.startingCashBalanceMmk}
          />

          <MoneyInput
            id="monthlySales"
            label="Average monthly sales"
            value={form.averageMonthlySalesMmk}
            onChange={(averageMonthlySalesMmk) =>
              setForm((current) => ({ ...current, averageMonthlySalesMmk }))
            }
            hint="A normal month, not a festival month."
            error={fieldErrors.averageMonthlySalesMmk}
          />

          <label className="block" htmlFor="employeeCount">
            <span className="mb-1 block text-sm font-medium">
              Number of employees
            </span>
            <input
              id="employeeCount"
              inputMode="numeric"
              className="w-full rounded-md border border-line px-3 py-2"
              value={form.employeeCount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  employeeCount: event.target.value.replace(/[^\d]/g, ''),
                }))
              }
            />
            {fieldErrors.employeeCount ? (
              <span className="mt-1 block text-xs text-risk">
                {fieldErrors.employeeCount}
              </span>
            ) : null}
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              Main expense categories
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EXPENSE_CATEGORIES.map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-2 rounded-md border border-line px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={form.mainExpenseCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <span>{EXPENSE_CATEGORY_LABELS[category]}</span>
                </label>
              ))}
            </div>
            {fieldErrors.mainExpenseCategories ? (
              <span className="mt-1 block text-xs text-risk">
                {fieldErrors.mainExpenseCategories}
              </span>
            ) : null}
          </fieldset>

          <label className="block" htmlFor="language">
            <span className="mb-1 block text-sm font-medium">
              Preferred language
            </span>
            <select
              id="language"
              className="w-full rounded-md border border-line px-3 py-2"
              value={form.preferredLanguage}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  preferredLanguage: event.target.value as PreferredLanguage,
                }))
              }
            >
              {PREFERRED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {LANGUAGE_LABELS[language]}
                </option>
              ))}
            </select>
          </label>

          <p className="rounded-md bg-bank-blue-light px-3 py-2 text-sm text-navy">
            Currency is fixed to MMK for this Myanmar SME version.
          </p>

          <button
            type="submit"
            className="w-full rounded-md bg-bank-blue px-4 py-3 font-semibold text-white"
          >
            Save and open dashboard
          </button>
        </form>
      </div>
    </div>
  )
}
