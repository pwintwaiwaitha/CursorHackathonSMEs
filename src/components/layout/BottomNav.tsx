import { NavLink, useLocation } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import { isNavItemActive, MOBILE_NAV_ITEMS, navLabel } from './nav'

export function BottomNav() {
  const { store } = useApp()
  const location = useLocation()
  const language = store.profile?.preferredLanguage ?? 'en'

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white lg:hidden">
      {/* 320px: 5 equal columns, 44px+ targets, 8px gaps */}
      <ul className="grid grid-cols-5 gap-0">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isNavItemActive(item.to, location.pathname)
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/dashboard'}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-sm font-semibold ${
                  active ? 'bg-healthy-bg text-navy' : 'text-muted'
                }`}
              >
                <Icon size={20} />
                {navLabel(item, language)}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
