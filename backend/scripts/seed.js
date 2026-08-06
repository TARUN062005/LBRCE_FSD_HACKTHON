/**
 * Seed demo data.
 * - admin + tenant_manager are created ONLY here (never via Google OAuth)
 * - Google OAuth always creates normal_user at runtime
 *
 * Usage: npm run seed --prefix backend
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const mongoose = require('mongoose')
const connectDB = require('../config/db')
const User = require('../models/User')
const Site = require('../models/Site')
const Charger = require('../models/Charger')
const Tenant = require('../models/Tenant')
const Vehicle = require('../models/Vehicle')
const Session = require('../models/Session')
const Invoice = require('../models/Invoice')
const Notification = require('../models/Notification')
const Booking = require('../models/Booking')

async function seed() {
  await connectDB()

  console.log('[seed] clearing collections…')
  await Promise.all([
    User.deleteMany({}),
    Site.deleteMany({}),
    Charger.deleteMany({}),
    Tenant.deleteMany({}),
    Vehicle.deleteMany({}),
    Session.deleteMany({}),
    Invoice.deleteMany({}),
    Notification.deleteMany({}),
    Booking.deleteMany({}),
  ])

  const site = await Site.create({
    name: 'Downtown Hub',
    location: 'Main St & 1st Ave',
    maxCapacityKw: 40,
  })

  const chargers = await Charger.insertMany([
    { siteId: site._id, label: 'A1', maxPowerKw: 22, status: 'available' },
    { siteId: site._id, label: 'A2', maxPowerKw: 50, status: 'available' },
    { siteId: site._id, label: 'B1', maxPowerKw: 22, status: 'available' },
  ])

  const tenantA = await Tenant.create({
    companyName: 'Alpha Fleet Co.',
    billingPlan: 'premium',
    siteId: site._id,
  })
  const tenantB = await Tenant.create({
    companyName: 'Beta Logistics',
    billingPlan: 'standard',
    siteId: site._id,
  })

  // Elevated roles — seed only (Google never creates these)
  await User.create([
    {
      name: 'Platform Admin',
      email: 'admin@example.com',
      picture: '',
      googleId: 'seed-admin',
      role: 'admin',
      tenantId: null,
    },
    {
      name: 'Tenant Alpha Manager',
      email: 'tenant1@example.com',
      picture: '',
      googleId: 'seed-tenant-alpha',
      role: 'tenant_manager',
      tenantId: tenantA._id,
    },
    {
      name: 'Tenant Beta Manager',
      email: 'tenant2@example.com',
      picture: '',
      googleId: 'seed-tenant-beta',
      role: 'tenant_manager',
      tenantId: tenantB._id,
    },
    {
      name: 'Demo Driver',
      email: 'driver@example.com',
      picture: '',
      googleId: 'seed-normal-user',
      role: 'normal_user',
      tenantId: null,
    },
  ])

  const departure = new Date(Date.now() + 4 * 60 * 60 * 1000)
  await Vehicle.create([
    {
      tenantId: tenantA._id,
      driverName: 'Alex Rivera',
      batteryCapacityKwh: 75,
      priorityTier: 'high',
      departureTime: departure,
    },
    {
      tenantId: tenantA._id,
      driverName: 'Sam Ortiz',
      batteryCapacityKwh: 60,
      priorityTier: 'sla',
      departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
    {
      tenantId: tenantB._id,
      driverName: 'Blair Chen',
      batteryCapacityKwh: 55,
      priorityTier: 'medium',
      departureTime: departure,
    },
  ])

  console.log('[seed] site:', site.name, `(${site.maxCapacityKw} kW)`)
  console.log('[seed] chargers:', chargers.map((c) => c.label).join(', '))
  console.log('[seed] tenants:', tenantA.companyName, '|', tenantB.companyName)
  console.log('[seed] roles (elevated ONLY via seed — never Google):')
  console.log('[seed]   admin@example.com          → admin')
  console.log('[seed]   tenant1@example.com        → tenant_manager (Alpha)')
  console.log('[seed]   tenant2@example.com        → tenant_manager (Beta)')
  console.log('[seed]   driver@example.com         → normal_user')
  console.log('[seed] Google OAuth always creates normal_user')
  console.log('[seed] done')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
