import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { homePathForRole } from '../lib/authToken'
import api from '../lib/axios'

export default function GoogleSignIn() {
  const { loginWithGoogle, loginWithDemo } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [config, setConfig] = useState({ loading: true, configured: false, demoAuth: true })
  const [busy, setBusy] = useState(false)
  const viteClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    let cancelled = false
    api
      .get('/auth/google')
      .then(({ data }) => {
        if (!cancelled) {
          setConfig({
            loading: false,
            configured: Boolean(data.data?.configured),
            demoAuth: Boolean(data.data?.demoAuth),
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfig({ loading: false, configured: false, demoAuth: true })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function finish(user) {
    toast(`Signed in as ${user.role.replace('_', ' ')}`, 'success')
    navigate(homePathForRole(user.role), { replace: true })
  }

  async function onGoogleSuccess(response) {
    setBusy(true)
    try {
      const user = await loginWithGoogle(response.credential)
      await finish(user)
    } catch (err) {
      toast(err.response?.data?.message || 'Google sign-in failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onDemo(role) {
    setBusy(true)
    try {
      const user = await loginWithDemo(role)
      await finish(user)
    } catch (err) {
      toast(err.response?.data?.message || 'Demo sign-in failed — run npm run seed', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (config.loading) {
    return <p className="text-center text-sm text-ink-muted">Loading sign-in…</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-ink-muted">
        Google always signs you in as <strong>normal_user</strong> (driver). Admins and tenant
        managers are seed / approval only.
      </p>

      {config.configured && viteClientId ? (
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={() => toast('Google popup failed', 'error')}
            useOneTap={false}
            theme="outline"
            size="large"
            shape="rectangular"
            text="continue_with"
            width="320"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface/60 p-3 text-center text-xs text-ink-muted dark:border-border-dark dark:bg-surface-dark/40">
          Set <code className="text-accent">GOOGLE_CLIENT_ID</code> +{' '}
          <code className="text-accent">VITE_GOOGLE_CLIENT_ID</code> for Google. Demo elevated
          accounts below are for judging only.
        </div>
      )}

      {config.demoAuth && (
        <div className="space-y-2 border-t border-border pt-4 dark:border-border-dark">
          <p className="text-center text-[11px] uppercase tracking-wider text-ink-muted">
            Seeded demo accounts (not Google)
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDemo('admin')}
            className="flex w-full items-center justify-center rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-ink"
          >
            Demo Admin
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDemo('tenant_manager')}
            className="flex w-full items-center justify-center rounded-xl border border-border bg-panel px-4 py-3 text-sm font-semibold disabled:opacity-60 dark:border-border-dark dark:bg-panel-dark"
          >
            Demo Tenant Manager
          </button>
        </div>
      )}
    </div>
  )
}
