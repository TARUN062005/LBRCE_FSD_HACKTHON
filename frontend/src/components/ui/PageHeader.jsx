/**
 * Page header — title + description + optional actions.
 * Presentational only; does not change routing or data.
 */
export default function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        {breadcrumb ? (
          <p className="mb-1.5 text-xs font-medium text-ink-muted">{breadcrumb}</p>
        ) : null}
        <h2 className="page-title">{title}</h2>
        {description ? <p className="page-desc">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
