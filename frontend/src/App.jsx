import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import api from './lib/axios'
import AppLayout from './layouts/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import SitesPanel from './pages/admin/SitesPanel'
import TenantsPanel from './pages/admin/TenantsPanel'
import UsersPanel from './pages/admin/UsersPanel'
import AdminPlaceholder from './pages/admin/Placeholder'
import TenantDashboard from './pages/tenant/TenantDashboard'
import BillingPanel from './pages/tenant/BillingPanel'
import TenantPlaceholder from './pages/tenant/Placeholder'
import ReportsPanel from './pages/admin/ReportsPanel'
import UserDashboard from './pages/user/UserDashboard'
import MapDiscover from './pages/user/MapDiscover'
import StationDetail from './pages/user/StationDetail'
import StationsPanel from './pages/user/StationsPanel'
import BookingsPanel from './pages/user/BookingsPanel'
import UserBillingPanel from './pages/user/BillingPanel'
import ProfilePanel from './pages/user/ProfilePanel'
import TenantStationsPanel from './pages/tenant/TenantStationsPanel'
import CreateStation from './pages/tenant/CreateStation'
import TenantBookingsPanel from './pages/tenant/TenantBookingsPanel'
import VehiclesPanel from './pages/tenant/VehiclesPanel'
import SessionBoard from './pages/shared/SessionBoard'
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
            <Route path="map" element={<MapDiscover />} />
            <Route path="stations/:id" element={<StationDetail />} />
            <Route path="stations" element={<StationsPanel />} />
            <Route path="bookings" element={<BookingsPanel />} />
            <Route path="billing" element={<UserBillingPanel />} />
            <Route path="profile" element={<ProfilePanel />} />
            <Route path="*" element={<Navigate to="/user" replace />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<AppLayout role="admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="sites" element={<SitesPanel />} />
            <Route path="tenants" element={<TenantsPanel />} />
            <Route path="users" element={<UsersPanel />} />
            <Route path="reports" element={<ReportsPanel />} />
            <Route path="sessions" element={<SessionBoard showPlugIn={false} />} />
            <Route path="settings" element={<AdminPlaceholder />} />
            <Route path="*" element={<AdminPlaceholder />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['tenant_manager']} />}>
          <Route path="/tenant" element={<AppLayout role="tenant" />}>
            <Route index element={<TenantDashboard />} />
            <Route path="stations/new" element={<CreateStation />} />
            <Route path="stations" element={<TenantStationsPanel />} />
            <Route path="bookings" element={<TenantBookingsPanel />} />
            <Route path="sessions" element={<SessionBoard showPlugIn />} />
            <Route path="vehicles" element={<VehiclesPanel />} />
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
