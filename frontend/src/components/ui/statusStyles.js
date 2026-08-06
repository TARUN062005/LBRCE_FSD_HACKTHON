/** Presentational status class maps — visual only */

export const SESSION_STATE_DOT = {
  queued: 'state-dot-queued',
  connected: 'state-dot-connected',
  charging: 'state-dot-charging',
  optimized: 'state-dot-optimized',
  throttled: 'state-dot-throttled',
  completed: 'state-dot-completed',
}

export const SESSION_STATE_COL = {
  queued: 'state-col-queued',
  connected: 'state-col-connected',
  charging: 'state-col-charging',
  optimized: 'state-col-optimized',
  throttled: 'state-col-throttled',
  completed: 'state-col-completed',
}

export const SESSION_STATE_BADGE = {
  queued: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
  connected: 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  charging: 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200',
  optimized: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  throttled: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  completed: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
}

export const BOOKING_STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  approved: 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200',
  charging: 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  completed: 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200',
  confirmed: 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200',
  offered: 'bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
}

export const TOAST_TYPE = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-100',
  error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/80 dark:text-red-100',
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/80 dark:text-sky-100',
}
