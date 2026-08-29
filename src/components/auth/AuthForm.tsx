import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { bilingualLine } from '../../lib/checkInCopy'
import { bilingualAuthError } from '../../lib/authErrors'
import type { AuthActionResult } from '../../lib/authApi'

const COPY = {
  email: { en: 'Email', my: 'အီးမေးလ်' },
  password: { en: 'Password', my: 'စကားဝှက်' },
  fullName: { en: 'Your name (optional)', my: 'အမည် (မဖြည့်လည်းရ)' },
  showPassword: { en: 'Show password', my: 'စကားဝှက်ကို ပြပါ' },
  hidePassword: { en: 'Hide password', my: 'စကားဝှက်ကို ဖုံးပါ' },
  signIn: { en: 'Sign in', my: 'ဝင်မည်' },
  signUp: { en: 'Create account', my: 'အကောင့်ဖွင့်မည်' },
  working: { en: 'Please wait…', my: 'ခေတ္တစောင့်ပါ…' },
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function AuthForm({
  mode,
  onSubmit,
  disabled = false,
}: {
  mode: 'signin' | 'signup'
  onSubmit: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<AuthActionResult>
  disabled?: boolean
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const busy = submitting || disabled
  const errorId = 'auth-form-error'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) {
      return
    }
    setError(null)
    setInfo(null)
    const trimmedEmail = email.trim()
    if (!isValidEmail(trimmedEmail)) {
      setError(
        bilingualAuthError(
          'Enter a valid email address',
          'မှန်ကန်သော အီးမေးလ် ရိုက်ပါ',
        ),
      )
      return
    }
    if (password.length < 6) {
      setError(
        bilingualAuthError(
          'Password must be at least 6 characters',
          'စကားဝှက် အနည်းဆုံး ၆ လုံး ရှိရမည်',
        ),
      )
      return
    }
    setSubmitting(true)
    try {
      const result = await onSubmit(
        trimmedEmail,
        password,
        mode === 'signup' ? fullName.trim() || undefined : undefined,
      )
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.needsEmailConfirmation) {
        setInfo(
          bilingualAuthError(
            'Check your email to confirm the account, then sign in',
            'အကောင့်အတည်ပြုရန် အီးမေးလ်ကို ကြည့်ပြီးမှ ဝင်ပါ',
          ),
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
      {mode === 'signup' ? (
        <label className="block" htmlFor="auth-full-name">
          <span className="mb-1 block text-sm font-medium text-ink">
            {bilingualLine(COPY.fullName, 'en')}
          </span>
          <input
            id="auth-full-name"
            name="fullName"
            autoComplete="name"
            className="min-h-11 w-full rounded-md border border-line px-3 py-2"
            value={fullName}
            disabled={busy}
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>
      ) : null}

      <label className="block" htmlFor="auth-email">
        <span className="mb-1 block text-sm font-medium text-ink">
          {bilingualLine(COPY.email, 'en')}
        </span>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 w-full rounded-md border border-line px-3 py-2"
          value={email}
          disabled={busy}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="block" htmlFor="auth-password">
        <span className="mb-1 block text-sm font-medium text-ink">
          {bilingualLine(COPY.password, 'en')}
        </span>
        <span className="flex min-h-11 overflow-hidden rounded-md border border-line">
          <input
            id="auth-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="min-w-0 flex-1 px-3 py-2 outline-none"
            value={password}
            disabled={busy}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="inline-flex items-center px-3 text-navy"
            aria-label={bilingualLine(
              showPassword ? COPY.hidePassword : COPY.showPassword,
              'en',
            )}
            aria-pressed={showPassword}
            disabled={busy}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </span>
      </label>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-risk">
          {error}
        </p>
      ) : null}
      {info ? (
        <p role="status" className="text-sm text-healthy">
          {info}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="min-h-12 w-full rounded-md bg-bank-blue px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-muted"
      >
        {busy
          ? bilingualLine(COPY.working, 'en')
          : bilingualLine(mode === 'signup' ? COPY.signUp : COPY.signIn, 'en')}
      </button>
    </form>
  )
}
