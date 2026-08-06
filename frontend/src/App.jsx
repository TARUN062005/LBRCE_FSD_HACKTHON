import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import api from './lib/axios'
import { getSocket } from './lib/socket'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminPlaceholder from './pages/admin/Placeholder'
import TenantDashboard from './pages/tenant/TenantDashboard'
import TenantPlaceholder from './pages/tenant/Placeholder'

export default function App() {
  const [health, setHealth] = useState({ status: 'checking', message: '' })

  useEffect(() => {
    let cancelled = false

    async function pingHealth() {
      try {
        const { data } = await api.get('/health')
        if (!cancelled) {
          setHealth({ status: 'ok', message: data.message || 'API healthy' })
        }
      } catch (err) {
        if (!cancelled) {
          setHealth({
            status: 'error',
            message: err.message || 'API unreachable',
          })
        }
      }
    }

    pingHealth()

    // Establish socket connection (tenant room join happens when auth lands)
    const socket = getSocket()
    return () => {
      cancelled = true
      socket.off('connect')
    }
  }, [])

  return (
    <>
      {health.status !== 'checking' && (
        <div
          className={[
            'fixed bottom-3 right-3 z-50 rounded-md px-3 py-1.5 text-xs shadow',
            health.status === 'ok'
              ? 'bg-accent text-white'
              : 'bg-red-600 text-white',
          ].join(' ')}
          title={health.message}
        >
          API: {health.status}
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={<AppLayout role="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="tenants" element={<AdminPlaceholder />} />
          <Route path="settings" element={<AdminPlaceholder />} />
          <Route path="*" element={<AdminPlaceholder />} />
        </Route>

        <Route path="/tenant" element={<AppLayout role="tenant" />}>
          <Route index element={<TenantDashboard />} />
          <Route path="bookings" element={<TenantPlaceholder />} />
          <Route path="settings" element={<TenantPlaceholder />} />
          <Route path="*" element={<TenantPlaceholder />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}
