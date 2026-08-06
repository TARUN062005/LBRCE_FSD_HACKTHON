export default function EmptyState({ title, description, action }) {
  return (
    <div className="ui-card flex flex-col items-center justify-center border-dashed px-6 py-12 text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-muted dark:bg-surface-dark"
        aria-hidden
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-ink dark:text-white">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
