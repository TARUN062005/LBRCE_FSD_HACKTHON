import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homePathForRole } from '../lib/authToken'

/**
 * Protects nested routes. Redirects unauthenticated users to /login.
 * If `roles` is set, wrong-role users are sent to their own home.
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, bootstrapping, user } = useAuth()
  const location = useLocation()

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-ink-muted dark:bg-surface-dark">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return <Outlet />
}
