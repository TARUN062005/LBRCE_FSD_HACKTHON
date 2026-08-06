export default function SkeletonCard({ rows = 3 }) {
  return (
    <div className="ui-card space-y-3 p-4" aria-hidden>
      <div className="skeleton-shimmer h-4 w-1/3 rounded-md" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer h-3 rounded-md"
          style={{ width: `${82 - i * 14}%` }}
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
