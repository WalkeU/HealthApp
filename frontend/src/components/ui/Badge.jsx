export default function Badge({ children, color = 'default' }) {
  const colors = {
    default: { background: 'var(--bg-hover)', color: 'var(--text-2)', border: 'var(--border)' },
    accent:  { background: 'var(--accent-10)', color: 'var(--accent)', border: 'var(--accent-20)' },
    danger:  { background: 'var(--danger-10)', color: 'var(--danger)', border: 'rgba(255,77,106,0.2)' },
    warning: { background: 'var(--warning-10)', color: 'var(--warning)', border: 'rgba(255,179,64,0.2)' },
  }
  const c = colors[color] || colors.default

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      padding: '2px 7px',
      borderRadius: 2,
      border: `1px solid ${c.border}`,
      background: c.background,
      color: c.color,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}
