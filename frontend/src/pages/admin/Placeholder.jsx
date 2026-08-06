import { useLocation } from 'react-router-dom'

export default function AdminPlaceholder() {
  const { pathname } = useLocation()
  const label = pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'page'

  return (
    <section className="space-y-2">
      <h2 className="page-title capitalize">{label}</h2>
      <p className="page-desc">Admin placeholder — not implemented yet.</p>
    </section>
  )
}
