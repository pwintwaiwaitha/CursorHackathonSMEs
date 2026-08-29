import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { pickLine } from '../../lib/checkInCopy'
import { ROUTES } from '../../lib/routes'
import { APP_HEADER_COPY } from '../../storage/ownerDemo'
import { LanguageSwitch } from '../dashboard/LanguageSwitch'
import { DemoBadge } from '../demo/DemoBadge'
import { NotificationCenter } from '../notifications/NotificationCenter'

export function AppHeader() {
  const { store, isDemoMode } = useApp()
  const language = store.profile?.preferredLanguage ?? 'en'
  const businessName = store.profile?.businessName
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    function onPointer(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [menuOpen])

  return (
    <header className="border-b border-line bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy">
            {APP_HEADER_COPY.brand}
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            {businessName ? (
              <p className="truncate text-sm font-medium text-ink">{businessName}</p>
            ) : null}
            {isDemoMode ? <DemoBadge compact language={language} /> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationCenter />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label={pickLine({ en: 'Profile', my: 'ပရိုဖိုင်' }, language)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[14px] text-navy"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <User size={22} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-56 rounded-[14px] border border-line bg-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {pickLine({ en: 'Language', my: 'ဘာသာစကား' }, language)}
                </p>
                <LanguageSwitch />
                <Link
                  to={ROUTES.settings}
                  className="mt-3 inline-flex min-h-11 w-full items-center rounded-md px-2 text-sm font-semibold text-navy"
                  onClick={() => setMenuOpen(false)}
                >
                  {pickLine({ en: 'Settings', my: 'ဆက်တင်' }, language)}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
