export default function TopBar({ title, children }) {
  return (
    <div className="flex items-center justify-between mb-5 gap-3">
      <h1 className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink-2">{title}</h1>
      {children && (
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      )}
    </div>
  )
}
