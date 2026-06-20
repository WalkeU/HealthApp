import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Moon, BookOpen,
  Zap, Download, Settings, Bot, Heart,
} from 'lucide-react'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard', short: 'Home'     },
  { to: '/runs',     icon: Activity,        label: 'Runs',      short: 'Runs'     },
  { to: '/sleep',    icon: Moon,            label: 'Sleep',     short: 'Sleep'    },
  { to: '/notes',    icon: BookOpen,        label: 'Journal',   short: 'Journal'  },
  { to: '/pain-log', icon: Zap,             label: 'Pain Log',  short: 'Pain'     },
  { to: '/import',   icon: Download,        label: 'Import',    short: 'Import'   },
  { to: '/insights', icon: Bot,             label: 'Insights',  short: 'AI'       },
  { to: '/settings', icon: Settings,        label: 'Settings',  short: 'More'     },
]

export default function Sidebar() {
  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav className="hidden md:flex fixed top-0 left-0 bottom-0 w-sidebar bg-card border-r border-border flex-col z-50">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-border shrink-0">
          <Heart size={14} className="text-accent fill-accent" />
          <span className="text-[11px] font-extrabold tracking-[0.18em] text-ink">HEALTH</span>
        </div>
        <div className="flex flex-col py-2 flex-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => [
                'relative flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors',
                isActive ? 'bg-accent/8 text-ink' : 'text-ink-2 hover:bg-hover hover:text-ink',
              ].join(' ')}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent rounded-r-sm" />
                  )}
                  <Icon size={15} className={isActive ? 'text-accent shrink-0' : 'text-ink-3 shrink-0'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-stretch">
        {NAV.map(({ to, icon: Icon, short }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex-1 flex flex-col items-center justify-center gap-[3px] pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] min-h-[52px] transition-colors active:bg-hover"
          >
            {({ isActive }) => (
              <>
                <div className={[
                  'relative flex items-center justify-center w-8 h-6 rounded-lg transition-colors',
                  isActive ? 'bg-accent/10' : '',
                ].join(' ')}>
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2.5 : 1.75}
                    className={isActive ? 'text-accent' : 'text-ink-3'}
                  />
                </div>
                <span className={[
                  'text-[9.5px] font-semibold tracking-wide leading-none',
                  isActive ? 'text-accent' : 'text-ink-3',
                ].join(' ')}>{short}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
