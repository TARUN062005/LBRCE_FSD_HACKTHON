import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ConnectionStatusBanner from '../components/ConnectionStatusBanner'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

const ADMIN_LINKS = [
  { to: '/admin', label: 'Judge Analytics', end: true },
  { to: '/admin/sites', label: 'Sites' },
  { to: '/admin/chargers', label: 'Chargers' },
  { to: '/admin/tenants', label: 'Tenants' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/sessions', label: 'Live Board' },
  { to: '/admin/reports', label: 'Reports' },
]

const TENANT_LINKS = [
  { to: '/tenant', label: 'Dashboard', end: true },
  { to: '/tenant/vehicles', label: 'Vehicles' },
  { to: '/tenant/sessions', label: 'Live Board' },
  { to: '/tenant/billing', label: 'Billing' },
]

const USER_LINKS = [
  { to: '/user', label: 'Home', end: true },
  { to: '/user/stations', label: 'Stations' },
  { to: '/user/bookings', label: 'My Bookings' },
  { to: '/user/billing', label: 'Invoices' },
  { to: '/user/profile', label: 'Profile' },
]

function titleFromPath(pathname) {
  if (pathname.startsWith('/admin/sites')) return 'Sites & Grid'
  if (pathname.startsWith('/admin/chargers')) return 'Chargers'
  if (pathname.startsWith('/admin/tenants')) return 'Tenants'
  if (pathname.startsWith('/admin/users')) return 'Users & Roles'
  if (pathname.startsWith('/admin/bookings')) return 'Booking Approvals'
  if (pathname.startsWith('/admin/sessions')) return 'Live Board'
  if (pathname.startsWith('/admin/reports')) return 'Reports'
  if (pathname.startsWith('/admin')) return 'Judge Analytics'
  if (pathname.startsWith('/tenant/vehicles')) return 'Vehicles'
  if (pathname.startsWith('/tenant/sessions')) return 'Live Board'
  if (pathname.startsWith('/tenant/billing')) return 'Billing'
  if (pathname.startsWith('/tenant')) return 'Fleet Dashboard'
  if (pathname.startsWith('/user/stations')) return 'Charging Stations'
  if (pathname.startsWith('/user/bookings')) return 'My Bookings'
  if (pathname.startsWith('/user/billing')) return 'Invoices'
  if (pathname.startsWith('/user/profile')) return 'Profile'
  if (pathname.startsWith('/user')) return 'Driver Home'
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
        <main className="mx-auto w-full max-w-7xl flex-1 p-3 xs:p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
