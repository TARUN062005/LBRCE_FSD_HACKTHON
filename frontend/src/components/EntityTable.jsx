/**
 * Responsive entity list: cards on mobile, table on md+.
 * columns: [{ key, label, render?(row) }]
 */
export default function EntityTable({ columns, rows, rowKey = 'id' }) {
  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article
            key={row[rowKey]}
            className="rounded-lg border border-border bg-panel p-4 dark:border-border-dark dark:bg-panel-dark"
          >
            <dl className="space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {col.label}
                  </dt>
                  <dd className="text-right text-sm text-ink dark:text-white">
                    {col.render ? col.render(row) : row[col.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border dark:border-border-dark md:block">
        <table className="min-w-full divide-y divide-border text-sm dark:divide-border-dark">
          <thead className="bg-surface dark:bg-surface-dark">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-panel dark:divide-border-dark dark:bg-panel-dark">
            {rows.map((row) => (
              <tr key={row[rowKey]}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-ink dark:text-white">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
