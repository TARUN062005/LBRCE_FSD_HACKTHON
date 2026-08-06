import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/axios'
import {
  clearAuthSession,
  homePathForRole,
  hydrateAuthSession,
  setAuthSession,
} from '../lib/authToken'
import {
  disconnectSocket,
  getSocket,
  joinAdminRoom,
  joinTenantRoom,
  joinUserRoom,
} from '../lib/socket'

const AuthContext = createContext(null)

function attachRealtime(user) {
  getSocket()
  if (user?.role === 'admin') {
    joinAdminRoom()
  } else if (user?.role === 'tenant_manager' && user?.tenantId) {
    joinTenantRoom(user.tenantId)
  } else if (user?.role === 'normal_user') {
    joinUserRoom(user.userId || user.id)
  }
}

export function AuthProvider({ children }) {
  const [{ token, user }, setSession] = useState(() => hydrateAuthSession())
  const [bootstrapping, setBootstrapping] = useState(Boolean(hydrateAuthSession().token))

  const applySession = useCallback((nextToken, nextUser) => {
    setAuthSession(nextToken, nextUser)
    setSession({ token: nextToken, user: nextUser })
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // still clear locally
    }
    clearAuthSession()
    setSession({ token: null, user: null })
    disconnectSocket()
  }, [])

  useEffect(() => {
    const onForcedLogout = () => {
      setSession({ token: null, user: null })
      disconnectSocket()
    }
    window.addEventListener('auth:logout', onForcedLogout)
    return () => window.removeEventListener('auth:logout', onForcedLogout)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function restore() {
      const { token: storedToken } = hydrateAuthSession()
      if (!storedToken) {
        setBootstrapping(false)
        return
      }

      try {
        const { data } = await api.get('/auth/me')
        if (cancelled) return
        applySession(storedToken, data.user)
        attachRealtime(data.user)
      } catch {
        if (!cancelled) {
          clearAuthSession()
          setSession({ token: null, user: null })
          disconnectSocket()
        }
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [applySession])

  const loginWithGoogle = useCallback(
    async (credential) => {
      const { data } = await api.post('/auth/google/callback', { credential })
      applySession(data.token, data.user)
      attachRealtime(data.user)
      return data.user
    },
    [applySession],
  )

  const value = useMemo(
    () => ({
      token,
      user,
      role: user?.role ?? null,
      tenantId: user?.tenantId ?? null,
      isAuthenticated: Boolean(token && user),
      bootstrapping,
      loginWithGoogle,
      logout,
      homePath: homePathForRole(user?.role),
    }),
    [token, user, bootstrapping, loginWithGoogle, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
