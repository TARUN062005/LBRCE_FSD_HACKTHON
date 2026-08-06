import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import api from './lib/axios'
import AppLayout from './layouts/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import SitesPanel from './pages/admin/SitesPanel'
import ChargersPanel from './pages/admin/ChargersPanel'
import TenantsPanel from './pages/admin/TenantsPanel'
import UsersPanel from './pages/admin/UsersPanel'
import BookingsAdminPanel from './pages/admin/BookingsAdminPanel'
import AdminPlaceholder from './pages/admin/Placeholder'
import TenantDashboard from './pages/tenant/TenantDashboard'
import VehiclesPanel from './pages/tenant/VehiclesPanel'
import BillingPanel from './pages/tenant/BillingPanel'
import TenantPlaceholder from './pages/tenant/Placeholder'
import ReportsPanel from './pages/admin/ReportsPanel'
import SessionBoard from './pages/shared/SessionBoard'
import UserDashboard from './pages/user/UserDashboard'
import StationsPanel from './pages/user/StationsPanel'
import BookingsPanel from './pages/user/BookingsPanel'
import ProfilePanel from './pages/user/ProfilePanel'
import ProtectedRoute from './routes/ProtectedRoute'

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
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      {health.status !== 'checking' && (
        <div
          className={[
            'fixed bottom-3 right-3 z-50 rounded-md px-3 py-1.5 text-xs shadow',
            health.status === 'ok' ? 'bg-accent text-white' : 'bg-red-600 text-white',
          ].join(' ')}
          title={health.message}
        >
          API: {health.status}
        </div>
      )}

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute roles={['normal_user']} />}>
          <Route path="/user" element={<AppLayout role="user" />}>
            <Route index element={<UserDashboard />} />
            <Route path="stations" element={<StationsPanel />} />
            <Route path="bookings" element={<BookingsPanel />} />
            <Route path="profile" element={<ProfilePanel />} />
            <Route path="*" element={<UserDashboard />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<AppLayout role="admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="sites" element={<SitesPanel />} />
            <Route path="chargers" element={<ChargersPanel />} />
            <Route path="tenants" element={<TenantsPanel />} />
            <Route path="users" element={<UsersPanel />} />
            <Route path="bookings" element={<BookingsAdminPanel />} />
            <Route path="sessions" element={<SessionBoard showPlugIn={false} />} />
            <Route path="reports" element={<ReportsPanel />} />
            <Route path="settings" element={<AdminPlaceholder />} />
            <Route path="*" element={<AdminPlaceholder />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['tenant_manager']} />}>
          <Route path="/tenant" element={<AppLayout role="tenant" />}>
            <Route index element={<TenantDashboard />} />
            <Route path="vehicles" element={<VehiclesPanel />} />
            <Route path="sessions" element={<SessionBoard showPlugIn />} />
            <Route path="billing" element={<BillingPanel />} />
            <Route path="settings" element={<TenantPlaceholder />} />
            <Route path="*" element={<TenantPlaceholder />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
