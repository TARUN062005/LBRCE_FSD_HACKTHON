import { useAuth } from '../../context/AuthContext'

export default function ProfilePanel() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <section className="mx-auto max-w-lg space-y-4">
      <div>
        <h2 className="page-title">Profile</h2>
        <p className="page-desc">Managed via Google OAuth identity.</p>
      </div>
      <div className="ui-card flex items-center gap-4 p-5">
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 font-display text-xl font-bold text-accent">
            {(user.name || '?')[0]}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink dark:text-white">{user.name}</p>
          <p className="truncate text-sm text-ink-muted">{user.email}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-accent">{user.role}</p>
        </div>
      </div>
      <div className="ui-card p-5 text-sm text-ink-muted">
        <p>
          New Google accounts are always <strong className="text-ink dark:text-white">normal_user</strong>.
          Fleet access requires an admin to promote you to tenant_manager. The platform admin is the
          Google account listed in <code>SUPER_ADMIN_EMAIL</code>.
        </p>
      </div>
    </section>
  )
}
