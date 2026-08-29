import { getSupabaseConfigError } from '../../lib/supabase'

export function SupabaseConfigBanner() {
  if (!import.meta.env.DEV) {
    return null
  }
  const error = getSupabaseConfigError()
  if (!error) {
    return null
  }
  return (
    <div
      className="border-b border-watch bg-watch-bg px-4 py-4 text-watch-ink"
      role="status"
    >
      <p className="text-base font-semibold">Supabase setup is incomplete</p>
      <p className="mt-1 text-sm">
        Add the project URL and publishable key to the local .env file, then
        restart the development server.
      </p>
    </div>
  )
}
