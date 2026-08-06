import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GoogleSignIn from '../components/GoogleSignIn'
import ThemeToggle from '../components/ThemeToggle'
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
    <div className="theme-surface relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-10 dark:bg-surface-dark">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(13,148,136,0.2),transparent_50%)]" />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-[400px] space-y-6"
      >
        <div className="space-y-2 text-center">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight">
            Route<span className="text-accent">Guardian</span>
          </Link>
          <h1 className="text-xl font-semibold text-ink dark:text-white">Continue with Google</h1>
          <p className="text-sm text-ink-muted">
            Drivers become <strong>normal_user</strong>. Tenant managers are approved by admins.
            Admins are created via seed only.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 xs:p-6">
          <GoogleSignIn />
        </div>

        <p className="text-center text-xs text-ink-muted">
          <Link to="/" className="text-accent underline-offset-2 hover:underline">
            ← Back to landing
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
