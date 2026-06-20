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
  { to: '/ai',       icon: Bot,             label: 'AI' },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  return (
    <nav className="sidebar" style={styles.sidebar}>
      <div className="sidebar-logo" style={styles.logo}>
        <Heart size={14} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
        <span style={styles.logoText}>HEALTH</span>
      </div>
      <div className="sidebar-nav" style={styles.nav}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="nav-link"
            style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}
          >
            {({ isActive }) => (
              <>
                <Icon size={15} style={{ color: isActive ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0 }} />
                <span className="nav-link-label" style={{ color: isActive ? 'var(--text)' : 'var(--text-2)' }}>
                  {label}
                </span>
                {isActive && <span style={styles.activeDot} />}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    width: 'var(--sidebar-w)',
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '20px 16px 16px',
    borderBottom: '1px solid var(--border)',
  },
  logoText: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.18em',
    color: 'var(--text)',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 0',
    flex: 1,
    overflowY: 'auto',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 16px',
    position: 'relative',
    transition: 'background 0.1s',
    fontSize: 12,
    fontWeight: 500,
  },
  linkActive: {
    background: 'var(--accent-10)',
  },
  activeDot: {
    position: 'absolute',
    left: 0, top: '50%',
    transform: 'translateY(-50%)',
    width: 2,
    height: 16,
    background: 'var(--accent)',
    borderRadius: '0 1px 1px 0',
  },
}
