import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/sites', label: 'Sites' },
  { to: '/admin/chargers', label: 'Chargers' },
  { to: '/admin/tenants', label: 'Tenants' },
]

const TENANT_LINKS = [
  { to: '/tenant', label: 'Dashboard', end: true },
  { to: '/tenant/vehicles', label: 'Vehicles' },
  { to: '/tenant/settings', label: 'Settings' },
]

function titleFromPath(pathname) {
  if (pathname.startsWith('/admin/sites')) return 'Sites & Grid'
  if (pathname.startsWith('/admin/chargers')) return 'Chargers'
  if (pathname.startsWith('/admin/tenants')) return 'Tenants'
  if (pathname.startsWith('/admin')) return 'Admin'
  if (pathname.startsWith('/tenant/vehicles')) return 'Vehicles'
  if (pathname.startsWith('/tenant')) return 'Tenant'
  return 'App'
}

export default function AppLayout({ role = 'admin' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const links = role === 'tenant' ? TENANT_LINKS : ADMIN_LINKS
  const brand = role === 'tenant' ? 'Tenant Portal' : 'Admin Portal'

  return (
    <div className="flex min-h-screen bg-surface dark:bg-surface-dark">
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
        <main className="flex-1 p-3 xs:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
