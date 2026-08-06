const STYLES = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  medium: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  high: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  sla: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
}

const LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  sla: 'SLA',
}

export default function PriorityBadge({ tier }) {
  const key = String(tier || 'medium').toLowerCase()
  return (
    <span
      className={[
        'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        STYLES[key] || STYLES.medium,
      ].join(' ')}
    >
      {LABELS[key] || tier}
    </span>
  )
}
