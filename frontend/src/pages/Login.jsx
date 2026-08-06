import { Link } from 'react-router-dom'

/** Placeholder login — auth wiring comes in a later task. */
export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 dark:bg-surface-dark">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-white">
          Sign in
        </h1>
        <p className="text-sm text-ink-muted">
          Auth is not wired yet. Use the role dashboards below to continue scaffolding.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            to="/admin"
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Open Admin Dashboard
          </Link>
          <Link
            to="/tenant"
            className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink hover:border-accent dark:border-border-dark dark:text-white"
          >
            Open Tenant Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
