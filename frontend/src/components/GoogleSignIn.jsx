import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { homePathForRole } from '../lib/authToken'
import api from '../lib/axios'

export default function GoogleSignIn() {
  const { loginWithGoogle } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [config, setConfig] = useState({ loading: true, configured: false })
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
          })
        }
      })
      .catch(() => {
        if (!cancelled) setConfig({ loading: false, configured: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onGoogleSuccess(response) {
    setBusy(true)
    try {
      const user = await loginWithGoogle(response.credential)
      toast(`Welcome, ${user.name}`, 'success')
      navigate(homePathForRole(user.role), { replace: true })
    } catch (err) {
      toast(err.response?.data?.message || 'Google sign-in failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (config.loading) {
    return <p className="text-center text-sm text-ink-muted">Loading sign-in…</p>
  }

  if (!config.configured || !viteClientId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/60 p-4 text-center text-sm text-ink-muted dark:border-border-dark dark:bg-surface-dark/40">
        Google OAuth is not configured. Set matching{' '}
        <code className="text-accent">GOOGLE_CLIENT_ID</code> (backend) and{' '}
        <code className="text-accent">VITE_GOOGLE_CLIENT_ID</code> (frontend), then redeploy.
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${busy ? 'pointer-events-none opacity-70' : ''}`}>
      <p className="text-center text-xs text-ink-muted">
        Continue with Google is the only sign-in method. New accounts become drivers (
        <strong>normal_user</strong>). The owner email in <code>SUPER_ADMIN_EMAIL</code> becomes
        admin.
      </p>
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
    </div>
  )
}
