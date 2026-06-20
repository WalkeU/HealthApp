export default function Button({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', style }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    fontWeight: 600,
    letterSpacing: '0.04em',
    transition: 'all 0.12s',
    opacity: disabled ? 0.45 : 1,
    whiteSpace: 'nowrap',
    ...(size === 'sm' ? { fontSize: 11, padding: '5px 10px' }
      : size === 'lg' ? { fontSize: 14, padding: '11px 22px' }
      : { fontSize: 12, padding: '8px 14px' }),
    ...(variant === 'primary' ? {
      background: 'var(--accent)',
      color: '#0d0d0f',
    } : variant === 'ghost' ? {
      background: 'transparent',
      color: 'var(--text-2)',
      border: '1px solid var(--border)',
    } : variant === 'danger' ? {
      background: 'var(--danger-10)',
      color: 'var(--danger)',
      border: '1px solid var(--danger)',
    } : variant === 'subtle' ? {
      background: 'var(--bg-hover)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
    } : {}),
    ...style,
  }

  return (
    <button type={type} style={base} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
