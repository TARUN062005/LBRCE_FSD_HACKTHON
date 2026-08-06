/**
 * Responsive entity list: cards on mobile, table on md+.
 * columns: [{ key, label, render?(row) }]
 */
export default function EntityTable({ columns, rows, rowKey = 'id' }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article key={row[rowKey]} className="ui-card p-4">
            <dl className="space-y-2.5">
              {columns.map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <dt className="text-xs font-medium text-ink-muted">{col.label}</dt>
                  <dd className="text-right text-sm font-medium text-ink dark:text-white">
                    {col.render ? col.render(row) : row[col.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <div className="ui-card hidden overflow-hidden p-0 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur dark:border-border-dark dark:bg-surface-dark/95">
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
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row[rowKey]}
                  className={[
                    'border-b border-border last:border-0 dark:border-border-dark',
                    i % 2 === 1 ? 'bg-surface/50 dark:bg-white/[0.02]' : 'bg-panel dark:bg-panel-dark',
                  ].join(' ')}
                >
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
      </div>
    </>
  )
}
