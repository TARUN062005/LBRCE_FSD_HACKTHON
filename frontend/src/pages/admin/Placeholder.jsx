import { useLocation } from 'react-router-dom'

export default function AdminPlaceholder() {
  const { pathname } = useLocation()
  const label = pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'page'

  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold capitalize text-ink dark:text-white">{label}</h2>
      <p className="text-sm text-ink-muted">Admin placeholder — not implemented yet.</p>
    </section>
  )
}
