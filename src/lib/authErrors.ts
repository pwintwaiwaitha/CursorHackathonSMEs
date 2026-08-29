export function bilingualAuthError(en: string, my: string): string {
  return `${en} / ${my}`
}

const AUTH_MESSAGE_MAP: Array<{ match: RegExp; message: string }> = [
  {
    match: /invalid login credentials|invalid_credentials/i,
    message: bilingualAuthError(
      'Incorrect email or password',
      'အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားနေပါသည်',
    ),
  },
  {
    match: /email not confirmed/i,
    message: bilingualAuthError(
      'Please confirm your email first',
      'အီးမေးလ်ကို အရင်အတည်ပြုပါ',
    ),
  },
  {
    match: /user already registered|already registered|already been registered/i,
    message: bilingualAuthError(
      'This email already has an account',
      'ဤအီးမေးလ်ဖြင့် အကောင့်ရှိပြီးသားဖြစ်သည်',
    ),
  },
  {
    match: /password should be at least|password is too short|weak password/i,
    message: bilingualAuthError(
      'Password is too short',
      'စကားဝှက် တိုလွန်းသည်',
    ),
  },
  {
    match: /rate limit|too many requests/i,
    message: bilingualAuthError(
      'Too many tries. Wait a moment',
      'ကြိုးစားမှုများလွန်းသည်။ ခဏစောင့်ပါ',
    ),
  },
  {
    match: /network|failed to fetch|fetch/i,
    message: bilingualAuthError(
      'Network error. Check your connection',
      'ကွန်ရက်ချိတ်ဆက်မှု ပြဿနာရှိသည်',
    ),
  },
  {
    match: /invalid email|unable to validate email/i,
    message: bilingualAuthError(
      'Enter a valid email address',
      'မှန်ကန်သော အီးမေးလ် ရိုက်ပါ',
    ),
  },
]

export function mapAuthError(error: { message?: string } | string | null | undefined): string {
  const raw = typeof error === 'string' ? error : (error?.message ?? '')
  if (!raw) {
    return bilingualAuthError(
      'Could not complete sign-in',
      'ဝင်ရောက်၍ မရပါ',
    )
  }
  for (const item of AUTH_MESSAGE_MAP) {
    if (item.match.test(raw)) {
      return item.message
    }
  }
  return bilingualAuthError(
    'Could not complete sign-in. Try again',
    'ဝင်ရောက်၍ မရပါ။ ထပ်ကြိုးစားပါ',
  )
}

export function missingSupabaseEnvMessage(isDev: boolean): string {
  if (isDev) {
    return bilingualAuthError(
      'Supabase setup is incomplete. Add the project URL and publishable key to the local .env file, then restart the development server.',
      'Supabase စနစ် သတ်မှတ်မှု မပြည့်စုံပါ။ ပရောဂျက် URL နှင့် publishable key ကို ဒေသခံ .env ဖိုင်တွင် ထည့်ပြီး development server ကို ပြန်စပါ။',
    )
  }
  return bilingualAuthError(
    'Supabase setup is incomplete. Cloud sign-in is not configured',
    'Supabase စနစ် သတ်မှတ်မှု မပြည့်စုံပါ။ အကောင့်ဝင်ရန် စနစ်ကို မသတ်မှတ်ရသေးပါ',
  )
}
