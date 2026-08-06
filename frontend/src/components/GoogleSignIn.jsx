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
            demoAuth: Boolean(data.data?.demoAuth || !data.data?.configured),
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
    toast(`Welcome, ${user.name}`, 'success')
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
      toast(err.response?.data?.message || 'Demo sign-in failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (config.loading) {
    return <p className="text-center text-sm text-ink-muted">Loading sign-in…</p>
  }

  return (
    <div className="space-y-4">
      {config.configured && viteClientId ? (
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={() => toast('Google popup failed', 'error')}
            useOneTap={false}
            theme="outline"
            size="large"
            shape="rectangular"
            text="signin_with"
            width="320"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface/60 p-3 text-center text-xs text-ink-muted dark:border-border-dark dark:bg-surface-dark/40">
          Set <code className="text-accent">GOOGLE_CLIENT_ID</code> and{' '}
          <code className="text-accent">VITE_GOOGLE_CLIENT_ID</code> for real Google OAuth.
          Demo buttons below work for judging without credentials.
        </div>
      )}

      {config.demoAuth && (
        <div className="space-y-2">
          <p className="text-center text-[11px] uppercase tracking-wider text-ink-muted">
            Demo access
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDemo('admin')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:opacity-60 dark:bg-white dark:text-ink"
          >
            Continue as Admin
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDemo('tenant_manager')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-panel px-4 py-3 text-sm font-semibold transition hover:border-accent disabled:opacity-60 dark:border-border-dark dark:bg-panel-dark"
          >
            Continue as Tenant Manager
          </button>
        </div>
      )}
    </div>
  )
}
