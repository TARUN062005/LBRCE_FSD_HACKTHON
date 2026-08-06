import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ConnectionStatusBanner from '../components/ConnectionStatusBanner'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

const ADMIN_LINKS = [
  { to: '/admin', label: 'Analytics', end: true },
  { to: '/admin/sites', label: 'Sites', end: false },
  { to: '/admin/chargers', label: 'Chargers', end: false },
  { to: '/admin/tenants', label: 'Tenants', end: false },
  { to: '/admin/users', label: 'Users', end: false },
  { to: '/admin/bookings', label: 'Bookings', end: false },
  { to: '/admin/sessions', label: 'Live board', end: false },
  { to: '/admin/reports', label: 'Reports', end: false },
]

const TENANT_LINKS = [
  { to: '/tenant', label: 'Dashboard', end: true },
  { to: '/tenant/vehicles', label: 'Vehicles', end: false },
  { to: '/tenant/sessions', label: 'Live board', end: false },
  { to: '/tenant/billing', label: 'Billing', end: false },
]

const USER_LINKS = [
  { to: '/user', label: 'Home', end: true },
  { to: '/user/stations', label: 'Stations', end: false },
  { to: '/user/bookings', label: 'My bookings', end: false },
  { to: '/user/billing', label: 'Invoices', end: false },
  { to: '/user/profile', label: 'Profile', end: false },
]

function titleFromPath(pathname) {
  if (pathname.startsWith('/admin/sites')) return 'Sites & grid'
  if (pathname.startsWith('/admin/chargers')) return 'Chargers'
  if (pathname.startsWith('/admin/tenants')) return 'Tenants'
  if (pathname.startsWith('/admin/users')) return 'Users & roles'
  if (pathname.startsWith('/admin/bookings')) return 'Booking approvals'
  if (pathname.startsWith('/admin/sessions')) return 'Live board'
  if (pathname.startsWith('/admin/reports')) return 'Reports'
  if (pathname.startsWith('/admin')) return 'Analytics'
  if (pathname.startsWith('/tenant/vehicles')) return 'Vehicles'
  if (pathname.startsWith('/tenant/sessions')) return 'Live board'
  if (pathname.startsWith('/tenant/billing')) return 'Billing'
  if (pathname.startsWith('/tenant')) return 'Fleet dashboard'
  if (pathname.startsWith('/user/stations')) return 'Charging stations'
  if (pathname.startsWith('/user/bookings')) return 'My bookings'
  if (pathname.startsWith('/user/billing')) return 'Invoices'
  if (pathname.startsWith('/user/profile')) return 'Profile'
  if (pathname.startsWith('/user')) return 'Driver home'
  return 'App'
}

export default function AppLayout({ role = 'admin' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const links =
    role === 'tenant' ? TENANT_LINKS : role === 'user' ? USER_LINKS : ADMIN_LINKS
  const brand = 'GridFleet'

  return (
    <div className="theme-surface flex min-h-screen bg-surface dark:bg-surface-dark">
      <Sidebar
        links={links}
        brand={brand}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={titleFromPath(pathname)}
          onMenuClick={() => setSidebarOpen((v) => !v)}
        />
        <ConnectionStatusBanner />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 xs:px-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
