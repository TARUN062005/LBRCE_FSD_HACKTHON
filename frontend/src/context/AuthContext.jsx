import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/axios'
import {
  clearAuthSession,
  homePathForRole,
  hydrateAuthSession,
  setAuthSession,
} from '../lib/authToken'
import { disconnectSocket, getSocket } from '../lib/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [{ token, user }, setSession] = useState(() => hydrateAuthSession())
  const [bootstrapping, setBootstrapping] = useState(Boolean(hydrateAuthSession().token))

  const applySession = useCallback((nextToken, nextUser) => {
    setAuthSession(nextToken, nextUser)
    setSession({ token: nextToken, user: nextUser })
  }, [])

  const logout = useCallback(() => {
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
        if (data.user?.tenantId) {
          getSocket(data.user.tenantId)
        }
      } catch {
        if (!cancelled) logout()
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [applySession, logout])


  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password })
      applySession(data.token, data.user)
      if (data.user?.tenantId) {
        getSocket(data.user.tenantId)
      } else {
        getSocket()
      }
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
      login,
      logout,
      homePath: homePathForRole(user?.role),
    }),
    [token, user, bootstrapping, login, logout],
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
