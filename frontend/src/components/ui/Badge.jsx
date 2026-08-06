/**
 * Status / label badge. Presentational only.
 */
export default function Badge({ children, className = '', tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    accent: 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200',
    success: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
    warning: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
    danger: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200',
    info: 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  }

  return (
    <span
      className={[
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide',
        tones[tone] || tones.neutral,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
