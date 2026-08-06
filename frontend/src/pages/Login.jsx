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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7faf9] px-4 py-10 dark:bg-[#070b10]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(20,184,166,0.22),transparent_50%)]" />
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
            Route<span className="text-teal-600 dark:text-teal-400">Guardian</span>
          </Link>
          <h1 className="text-xl font-semibold text-ink dark:text-white">Sign in with Google</h1>
          <p className="text-sm text-ink-muted">
            Secure OAuth for admins and tenant managers. Demo buttons available when Google Client ID
            is not configured.
          </p>
        </div>

        <div className="rounded-2xl border border-white/50 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] xs:p-6">
          <GoogleSignIn />
        </div>

        <p className="text-center text-xs text-ink-muted">
          <Link to="/" className="text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
            ← Back to landing
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
