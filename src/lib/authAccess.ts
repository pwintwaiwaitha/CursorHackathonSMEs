import { isAuthRequiredPath as pathRequiresAuth } from './routes'

export { AUTH_REQUIRED_PATHS } from './routes'

export function isAuthRequiredPath(pathname: string): boolean {
  return pathRequiresAuth(pathname)
}

export function canAccessProtectedApp(options: {
  isAuthenticated: boolean
  isDemoMode: boolean
}): boolean {
  return options.isDemoMode || options.isAuthenticated
}

export function shouldUseSupabase(options: {
  isAuthenticated: boolean
  isDemoMode: boolean
}): boolean {
  return options.isAuthenticated && !options.isDemoMode
}
