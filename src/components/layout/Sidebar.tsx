import { NavLink, useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { DemoBadge } from '../demo/DemoBadge'
import { useApp } from '../../context/useApp'
import { pickLine } from '../../lib/checkInCopy'
import { ROUTES } from '../../lib/routes'
import type { PreferredLanguage } from '../../types/models'
import { isNavItemActive, NAV_ITEMS, navLabel } from './nav'

export function Sidebar({
  businessName,
  language = 'en',
}: {
  businessName: string
  language?: PreferredLanguage
}) {
  const { isDemoMode } = useApp()
  const location = useLocation()

  return (
    <aside className="hidden w-60 shrink-0 border-r border-white/15 bg-navy text-white lg:flex lg:flex-col">
      <div className="border-b border-white/15 px-5 py-5">
        <p className="text-sm font-medium uppercase tracking-wider text-white/80">
          SME Mate AI
        </p>
        <p className="mt-3 flex items-center gap-2 truncate text-base text-white/80">
          <span className="truncate">{businessName}</span>
          {isDemoMode ? <DemoBadge compact language={language} /> : null}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isNavItemActive(item.to, location.pathname)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.dashboard}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-medium ${
                active ? 'bg-bank-blue-light text-navy' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Icon size={20} />
              {navLabel(item, language)}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-white/15 p-3">
        <NavLink
          to={ROUTES.settings}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-medium ${
              isActive ? 'bg-bank-blue-light text-navy' : 'text-white/90 hover:bg-white/10'
            }`
          }
        >
          <Settings size={20} />
          {pickLine({ en: 'Settings', my: 'ဆက်တင်' }, language)}
        </NavLink>
      </div>
    </aside>
  )
}
