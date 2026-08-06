import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ConnectionStatusBanner from '../components/ConnectionStatusBanner'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

const ADMIN_LINKS = [
  { to: '/admin', label: 'Analytics', end: true },
  { to: '/admin/sites', label: 'Stations', end: false },
  { to: '/admin/tenants', label: 'Companies', end: false },
  { to: '/admin/users', label: 'Managers', end: false },
  { to: '/admin/reports', label: 'Reports', end: false },
]

const TENANT_LINKS = [
  { to: '/tenant', label: 'Home', end: true },
  { to: '/tenant/stations', label: 'Stations', end: false },
  { to: '/tenant/bookings', label: 'Bookings', end: false },
  { to: '/tenant/billing', label: 'Earnings', end: false },
]

const USER_LINKS = [
  { to: '/user', label: 'Home', end: true },
  { to: '/user/map', label: 'Map', end: false },
  { to: '/user/stations', label: 'Stations', end: false },
  { to: '/user/bookings', label: 'My bookings', end: false },
  { to: '/user/billing', label: 'Invoices', end: false },
  { to: '/user/profile', label: 'Profile', end: false },
]

function titleFromPath(pathname) {
  if (pathname.startsWith('/admin/sites')) return 'Stations'
  if (pathname.startsWith('/admin/tenants')) return 'Charging companies'
  if (pathname.startsWith('/admin/users')) return 'Promote managers'
  if (pathname.startsWith('/admin/reports')) return 'Platform reports'
  if (pathname.startsWith('/admin')) return 'Platform analytics'
  if (pathname.startsWith('/tenant/stations/new')) return 'Create station'
  if (pathname.startsWith('/tenant/stations')) return 'My stations'
  if (pathname.startsWith('/tenant/bookings')) return 'Booking requests'
  if (pathname.startsWith('/tenant/billing')) return 'Earnings'
  if (pathname.startsWith('/tenant')) return 'Host home'
  if (pathname.startsWith('/user/map')) return 'Nearby chargers'
  if (pathname.startsWith('/user/stations/')) return 'Station details'
  if (pathname.startsWith('/user/stations')) return 'Charging stations'
  if (pathname.startsWith('/user/bookings')) return 'My bookings'
  if (pathname.startsWith('/user/billing')) return 'Invoices'
  if (pathname.startsWith('/user/profile')) return 'Profile'
  if (pathname.startsWith('/user')) return 'Home'
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
