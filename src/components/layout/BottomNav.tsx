import { NavLink } from 'react-router-dom'
import { MOBILE_NAV_ITEMS } from './nav'

export function BottomNav() {
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
                  `flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium ${
                    isActive ? 'text-navy' : 'text-muted'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
