import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav'

export function Sidebar({ businessName }: { businessName: string }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-navy text-white lg:flex lg:flex-col">
      <div className="border-b border-white/15 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-white/70">
          SME Mate AI
        </p>
        <p className="mt-1 text-lg font-semibold">Cash-Flow Copilot</p>
        <p className="mt-3 truncate text-sm text-white/80">{businessName}</p>
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
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-white text-navy' : 'text-white/85 hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <p className="px-5 py-4 text-xs text-white/60">Amounts in MMK</p>
    </aside>
  )
}
