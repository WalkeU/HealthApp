export default function TopBar({ title, children }) {
  return (
    <div className="flex items-center justify-between mb-6 gap-4">
      <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-ink-2">{title}</span>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
