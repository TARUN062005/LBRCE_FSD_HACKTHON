import { useEffect, useRef, useState } from 'react'
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
  const [showButton, setShowButton] = useState(false)
  const mountedOnce = useRef(false)
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

  useEffect(() => {
    if (!config.configured || !viteClientId) {
      setShowButton(false)
      return undefined
    }
    const id = window.setTimeout(() => {
      if (!mountedOnce.current) {
        mountedOnce.current = true
      }
      setShowButton(true)
    }, 0)
    return () => window.clearTimeout(id)
  }, [config.configured, viteClientId])

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
    return (
      <p className="flex items-center justify-center gap-2 py-3 text-center text-sm text-ink-muted">
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-r-transparent"
          aria-hidden
        />
        Loading…
      </p>
    )
  }

  if (!config.configured || !viteClientId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-5 text-center text-sm leading-relaxed text-ink-muted dark:border-border-dark dark:bg-surface-dark">
        Google sign-in is not available right now. Please try again later.
      </div>
    )
  }

  return (
    <div className={busy ? 'pointer-events-none opacity-70' : ''}>
      {busy && (
        <p className="mb-3 flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
          <span
            className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-r-transparent"
            aria-hidden
          />
          Signing you in…
        </p>
      )}
      <div className="flex min-h-[44px] justify-center">
        {showButton ? (
          <GoogleLogin
            key="gridfleet-google-login"
            onSuccess={onGoogleSuccess}
            onError={() => toast('Google sign-in failed', 'error')}
            useOneTap={false}
            theme="outline"
            size="large"
            shape="pill"
            text="continue_with"
            width="340"
            logo_alignment="left"
            auto_select={false}
            cancel_on_tap_outside
          />
        ) : (
          <span className="text-xs text-ink-muted">Preparing…</span>
        )}
      </div>
    </div>
  )
}
