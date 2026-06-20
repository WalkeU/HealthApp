export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 gap-2 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-hover border border-border flex items-center justify-center mb-2">
          <Icon size={24} className="text-ink-3" />
        </div>
      )}
      <div className="text-[13px] font-semibold text-ink-2">{title}</div>
      {description && <div className="text-xs text-ink-3 max-w-[280px] leading-relaxed">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
