import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Moon, BookOpen,
  Zap, Download, Settings, Bot, Heart,
} from 'lucide-react'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/runs',     icon: Activity,        label: 'Runs' },
  { to: '/sleep',    icon: Moon,            label: 'Sleep' },
  { to: '/notes',    icon: BookOpen,        label: 'Journal' },
  { to: '/pain-log', icon: Zap,             label: 'Pain Log' },
  { to: '/import',   icon: Download,        label: 'Import' },
  { to: '/insights', icon: Bot,             label: 'Insights' },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  return (
    <nav className="
      fixed bottom-0 left-0 right-0 top-auto w-full h-[60px] flex-row border-t border-border bg-card z-50
      md:top-0 md:left-0 md:bottom-0 md:right-auto md:w-sidebar md:h-auto md:flex-col md:border-r md:border-t-0
      flex
    ">
      {/* Logo "” hidden on mobile */}
      <div className="hidden md:flex items-center gap-2 px-4 pt-5 pb-4 border-b border-border">
        <Heart size={14} className="text-accent fill-accent" />
        <span className="text-[11px] font-extrabold tracking-[0.18em] text-ink">HEALTH</span>
      </div>

      {/* Nav links */}
      <div className="flex md:flex-col flex-row w-full md:w-auto flex-1 overflow-y-auto py-0 md:py-2 justify-around md:justify-start">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'relative flex items-center gap-[10px] px-4 py-[9px] transition-colors duration-100 text-[12px] font-medium',
                'md:flex-row flex-col md:gap-[10px] gap-[2px] md:py-[9px] py-2 md:px-4 px-3 md:text-[12px] text-[9px]',
                isActive ? 'bg-accent/8' : 'hover:bg-hover',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent rounded-r-[1px]" />
                )}
                <Icon size={15} className={isActive ? 'text-accent shrink-0' : 'text-ink-3 shrink-0'} />
                <span className={isActive ? 'text-ink' : 'text-ink-2'}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

