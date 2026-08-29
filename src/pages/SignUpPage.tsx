import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthForm } from '../components/auth/AuthForm'
import { SupabaseConfigBanner } from '../components/auth/SupabaseConfigBanner'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../context/useApp'

export function SignUpPage() {
  const { user, loading, signUp, configError } = useAuth()
  const { exitDemoMode } = useApp()
  const navigate = useNavigate()

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
          Create account
        </h1>
        <p className="mt-2 text-muted">
          After you sign in, confirmed cash records save to Supabase. Demo shops
          stay on this phone only.
        </p>

        <div className="mt-6 rounded-lg border border-line bg-white p-5 shadow-sm">
          <AuthForm
            mode="signup"
            disabled={Boolean(configError)}
            onSubmit={async (email, password, fullName) => {
              const result = await signUp(email, password, fullName)
              if (result.ok && result.session) {
                exitDemoMode()
                navigate('/dashboard', { replace: true })
              }
              return result
            }}
          />
        </div>

        <p className="mt-2 text-sm text-muted">
          <Link to="/dashboard" className="font-semibold text-navy underline">
            Back to J Clothing demo
          </Link>
        </p>
      </div>
    </div>
  )
}
