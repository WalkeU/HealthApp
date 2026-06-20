export default function Badge({ children, color = 'default' }) {
  const colorClass = color === 'accent'
    ? 'bg-accent/8 text-accent border-accent/18'
    : color === 'danger'
    ? 'bg-danger/8 text-danger border-danger/20'
    : color === 'warning'
    ? 'bg-warn/10 text-warn border-warn/20'
    : 'bg-hover text-ink-2 border-border'

  return (
    <span className={`inline-flex items-center text-[10px] font-semibold tracking-[0.06em] uppercase px-[7px] py-[2px] rounded-sm border whitespace-nowrap ${colorClass}`}>
      {children}
    </span>
  )
}

