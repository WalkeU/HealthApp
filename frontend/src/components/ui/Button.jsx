export default function Button({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', className = '' }) {
  // All buttons: min touch target 44px height on mobile
  const sizeClass = size === 'sm'
    ? 'text-[11px] px-2.5 py-1.5 min-h-[36px] md:min-h-0 md:py-[5px]'
    : size === 'lg'
    ? 'text-sm px-[22px] py-3 min-h-[48px]'
    : 'text-xs px-3.5 py-2.5 min-h-[44px] md:min-h-0 md:py-2'

  const variantClass = variant === 'primary'
    ? 'bg-accent text-surface border-0'
    : variant === 'ghost'
    ? 'bg-transparent text-ink-2 border border-border'
    : variant === 'danger'
    ? 'bg-danger/8 text-danger border border-danger'
    : variant === 'subtle'
    ? 'bg-hover text-ink border border-border'
    : ''

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded font-semibold tracking-[0.04em] transition-all duration-[120ms] whitespace-nowrap cursor-pointer active:scale-[0.97]',
        sizeClass,
        variantClass,
        disabled ? 'opacity-[0.45] cursor-not-allowed' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
