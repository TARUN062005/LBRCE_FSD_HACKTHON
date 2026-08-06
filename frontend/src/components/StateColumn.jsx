import SessionCard from './SessionCard'

export default function StateColumn({ title, sessions, onStop }) {
  return (
    <section className="flex min-w-[200px] flex-1 flex-col rounded-lg border border-border bg-surface/60 dark:border-border-dark dark:bg-surface-dark/60">
      <header className="flex items-center justify-between border-b border-border px-3 py-2 dark:border-border-dark">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {title}
        </h3>
        <span className="rounded-full bg-panel px-2 py-0.5 text-xs text-ink dark:bg-panel-dark dark:text-white">
          {sessions.length}
        </span>
      </header>
      <div className="flex flex-col gap-2 p-2">
        {sessions.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-ink-muted">Empty</p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="animate-session-in"
            >
              <SessionCard session={session} onStop={onStop} />
            </div>
          ))
        )}
      </div>
    </section>
  )
}
