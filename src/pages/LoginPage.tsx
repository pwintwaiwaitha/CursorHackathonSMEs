import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthForm } from '../components/auth/AuthForm'
import { SupabaseConfigBanner } from '../components/auth/SupabaseConfigBanner'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../context/useApp'

export function LoginPage() {
  const { user, loading, signIn, configError } = useAuth()
  const { exitDemoMode } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : '/dashboard'

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-page px-4 py-8">
      <SupabaseConfigBanner />
      <div className="mx-auto max-w-md">
        <p className="text-sm font-semibold uppercase tracking-wider text-bank-blue">
          SME Mate AI
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">
          Sign in
        </h1>
        <p className="mt-2 text-muted">
          Real shop books save to your account. Demo stays on this phone and is
          never copied into a signed-in account.
        </p>

        <div className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
          <AuthForm
            mode="signin"
            disabled={Boolean(configError)}
            onSubmit={async (email, password) => {
              const result = await signIn(email, password)
              if (result.ok && result.session) {
                exitDemoMode()
                navigate(from === '/login' || from === '/signup' ? '/dashboard' : from, {
                  replace: true,
                })
              }
              return result
            }}
          />
        </div>

        <p className="mt-4 text-sm text-muted">
          No account yet?{' '}
          <Link to="/signup" className="font-semibold text-navy underline">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-sm text-muted">
          <Link to="/dashboard" className="font-semibold text-navy underline">
            Back to J Clothing demo
          </Link>
        </p>
      </div>
    </div>
  )
}
