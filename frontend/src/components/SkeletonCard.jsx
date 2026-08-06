export default function SkeletonCard({ rows = 3 }) {
  return (
    <div className="animate-pulse space-y-3 rounded-lg border border-border bg-panel p-4 dark:border-border-dark dark:bg-panel-dark">
      <div className="h-4 w-1/3 rounded bg-border dark:bg-border-dark" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-border dark:bg-border-dark"
          style={{ width: `${80 - i * 12}%` }}
        />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
