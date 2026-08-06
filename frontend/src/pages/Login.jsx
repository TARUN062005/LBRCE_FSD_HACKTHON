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
        <span className="inline-flex items-center gap-2">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-r-transparent"
            aria-hidden
          />
          Loading…
        </span>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={homePath} replace />
  }

  return (
    <div className="theme-surface relative min-h-screen bg-surface dark:bg-surface-dark">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-2">
        {/* Left panel — desktop */}
        <aside className="relative hidden overflow-hidden border-r border-border bg-ink px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between dark:border-border-dark dark:bg-[#0a0d12]">
          <div>
            <Link to="/" className="font-display text-xl font-bold tracking-tight">
              Grid<span className="text-teal-300">Fleet</span>
            </Link>
            <p className="mt-10 max-w-md font-display text-3xl font-semibold leading-tight tracking-tight">
              Orchestrate depot power without guessing.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300">
              Sign in with Google to open your role-based portal — driver, fleet manager, or
              platform admin.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Live board', value: 'Socket.IO' },
              { label: 'Optimizer', value: 'Grid-aware' },
              { label: 'Billing', value: 'Metered' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          <div
            className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl"
            aria-hidden
          />
        </aside>

        {/* Right — login card */}
        <div className="flex items-center justify-center px-4 py-16 xs:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[400px] space-y-6"
          >
            <div className="space-y-2 lg:hidden">
              <Link to="/" className="font-display text-2xl font-bold tracking-tight">
                Grid<span className="text-accent">Fleet</span>
              </Link>
            </div>

            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink dark:text-white">
                Sign in
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Continue with Google. Your portal opens based on your account role.
              </p>
            </div>

            <div className="ui-card p-5 xs:p-6">
              <GoogleSignIn />
            </div>

            <p className="text-center text-xs text-ink-muted">
              <Link to="/" className="font-medium text-accent underline-offset-2 hover:underline">
                ← Back to home
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
