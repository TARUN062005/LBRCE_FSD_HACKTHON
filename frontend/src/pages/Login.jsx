import { Navigate } from 'react-router-dom'
import LoginForm from '../components/LoginForm'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { isAuthenticated, bootstrapping, homePath } = useAuth()

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-ink-muted dark:bg-surface-dark">
        Loading…
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={homePath} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8 dark:bg-surface-dark">
      <div className="w-full max-w-[360px] space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-white">Sign in</h1>
          <p className="text-sm text-ink-muted">Use your admin or tenant manager account.</p>
        </div>

        <div className="rounded-lg border border-border bg-panel p-4 xs:p-5 dark:border-border-dark dark:bg-panel-dark">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-ink-muted">
          Seeded: admin@example.com / Admin@123 · tenant1@example.com / Tenant@123
        </p>
      </div>
    </div>
  )
}
