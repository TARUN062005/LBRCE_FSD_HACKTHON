/**
 * Shared card shell. Presentational wrapper only.
 */
export default function Card({ children, className = '', hover = false, padding = true, as: Tag = 'div' }) {
  return (
    <Tag
      className={[
        'ui-card',
        hover ? 'ui-card-hover' : '',
        padding ? 'p-4 md:p-5' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  )
}
