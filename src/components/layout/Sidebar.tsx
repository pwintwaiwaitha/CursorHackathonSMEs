import { NavLink } from 'react-router-dom'
import { DemoBadge } from '../demo/DemoBadge'
import { DemoBusinessSwitcher } from '../demo/DemoBusinessSwitcher'
import { useApp } from '../../context/useApp'
import type { PreferredLanguage } from '../../types/models'
import { NAV_ITEMS, navLabel } from './nav'

export function Sidebar({
  businessName,
  language = 'en',
}: {
  businessName: string
  language?: PreferredLanguage
  isDemoMode?: boolean
}) {
  const { isDemoMode } = useApp()

  return (
    <aside className="hidden w-60 shrink-0 border-r border-white/15 bg-navy text-white lg:flex lg:flex-col">
      <div className="border-b border-white/15 px-5 py-5">
        <p className="text-sm font-medium uppercase tracking-wider text-white/80">
          SME Mate AI
        </p>
        <p className="mt-1 text-lg font-semibold">Cash helper</p>
        <p className="mt-3 flex items-center gap-2 truncate text-base text-white/80">
          <span className="truncate">{businessName}</span>
          {isDemoMode ? <DemoBadge compact /> : null}
        </p>
        {isDemoMode ? (
          <p className="mt-2 text-[11px] uppercase tracking-wide text-white/55">
            Demonstration data
          </p>
        ) : null}
        <div className="mt-3">
          <DemoBusinessSwitcher variant="compact" tone="dark" />
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-medium ${
                  isActive ? 'bg-bank-blue-light text-navy' : 'text-white/90 hover:bg-white/10'
                }`
              }
            >
              <Icon size={20} />
              {navLabel(item, language)}
            </NavLink>
          )
        })}
      </nav>
      <p className="px-5 py-4 text-sm text-white/70">Amounts in MMK</p>
    </aside>
  )
}
