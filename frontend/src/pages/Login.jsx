import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GoogleSignIn from '../components/GoogleSignIn'
import ThemeToggle from '../components/ThemeToggle'
import ChargingIllustration from '../components/landing/ChargingIllustration'
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
    <div className="theme-surface relative min-h-screen overflow-hidden bg-surface dark:bg-surface-dark">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(15,118,110,0.08),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_70%_0%,rgba(45,212,191,0.07),transparent_48%)]" />

      <header className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" className="font-display text-xl font-bold tracking-tight text-ink dark:text-white">
          Grid<span className="text-accent">Fleet</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/" className="hidden text-sm font-medium text-ink-muted transition hover:text-ink sm:inline dark:hover:text-white">
            Home
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[1400px] items-center gap-10 px-5 pb-16 pt-4 md:px-8 lg:grid-cols-2 lg:gap-16 lg:pb-20">
        {/* Brand / visual */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 hidden lg:order-1 lg:block"
        >
          <p className="section-title">Welcome back</p>
          <h1 className="mt-3 max-w-lg font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink xl:text-5xl dark:text-white">
            Find a charger.
            <br />
            <span className="text-accent">Book in seconds.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-muted">
            One secure Google sign-in for drivers, charging companies, and platform operators.
          </p>
          <div className="mt-10 max-w-lg">
            <div className="ui-card overflow-hidden p-4">
              <ChargingIllustration />
            </div>
          </div>
        </motion.div>

        {/* Sign-in card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="order-1 mx-auto w-full max-w-[420px] lg:order-2 lg:mx-0 lg:justify-self-end"
        >
          <div className="ui-card px-6 py-8 shadow-[var(--shadow-md)] xs:px-8 xs:py-10">
            <div className="mb-8 text-center lg:text-left">
              <div className="mb-5 flex justify-center lg:hidden">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 font-display text-lg font-bold text-accent">
                  G
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink dark:text-white">
                Sign in to GridFleet
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Continue with your Google account to open your dashboard.
              </p>
            </div>

            <GoogleSignIn />

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-border dark:border-border-dark" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-panel px-3 text-ink-muted dark:bg-panel-dark">Secure sign-in</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-sm text-ink-muted">
              <li className="flex gap-2.5">
                <span className="mt-0.5 text-accent" aria-hidden>
                  ✓
                </span>
                Nearby stations on a live map
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 text-accent" aria-hidden>
                  ✓
                </span>
                Book slots and pay in one flow
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 text-accent" aria-hidden>
                  ✓
                </span>
                Host stations if you run a charging company
              </li>
            </ul>
          </div>

          <p className="mt-6 text-center text-sm text-ink-muted">
            <Link to="/" className="font-medium text-ink transition hover:text-accent dark:text-slate-200 dark:hover:text-accent">
              ← Back to home
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
