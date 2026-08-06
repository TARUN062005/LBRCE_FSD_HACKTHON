import SessionCard from './SessionCard'
import { SESSION_STATE_COL, SESSION_STATE_DOT } from './ui/statusStyles'

export default function StateColumn({ title, sessions, onStop, onAdjust, stateKey = 'queued' }) {
  const key = stateKey || 'queued'
  const colClass = SESSION_STATE_COL[key] || SESSION_STATE_COL.queued
  const dotClass = SESSION_STATE_DOT[key] || SESSION_STATE_DOT.queued

  return (
    <section
      className={[
        'flex min-w-[220px] flex-1 flex-col rounded-xl border border-border bg-panel dark:border-border-dark dark:bg-panel-dark',
        colClass,
      ].join(' ')}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5 dark:border-border-dark">
        <div className="flex items-center gap-2">
          <span className={['h-2 w-2 shrink-0 rounded-full', dotClass].join(' ')} aria-hidden />
          <h3 className="text-xs font-semibold tracking-wide text-ink dark:text-white">{title}</h3>
        </div>
        <span
          className="rounded-md bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-muted dark:bg-surface-dark"
          aria-label={`${sessions.length} sessions`}
        >
          {sessions.length}
        </span>
      </header>
      <div className="flex min-h-[120px] flex-col gap-2 p-2">
        {sessions.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-ink-muted">No sessions</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="animate-session-in">
              <SessionCard session={session} onStop={onStop} onAdjust={onAdjust} />
            </div>
          ))
        )}
      </div>
    </section>
  )
}
