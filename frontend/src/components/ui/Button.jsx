/**
 * Shared button. Same click handlers — visual only.
 * variant: primary | secondary | danger | ghost
 */
export default function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  loading = false,
  disabled,
  ...rest
}) {
  const variants = {
    primary: 'ui-btn ui-btn-primary',
    secondary: 'ui-btn ui-btn-secondary',
    danger: 'ui-btn ui-btn-danger',
    ghost:
      'ui-btn border border-transparent text-ink-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/5 dark:hover:text-white',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[variants[variant] || variants.primary, className].join(' ')}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  )
}
