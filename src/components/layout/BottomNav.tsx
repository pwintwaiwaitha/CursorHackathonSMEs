import { NavLink } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import { MOBILE_NAV_ITEMS, navLabel } from './nav'

export function BottomNav() {
  const { store } = useApp()
  const language = store.profile?.preferredLanguage ?? 'en'

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white lg:hidden">
      <ul className="grid grid-cols-5">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-sm font-semibold ${
                    isActive
                      ? 'bg-bank-blue-light text-navy'
                      : 'text-muted'
                  }`
                }
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
