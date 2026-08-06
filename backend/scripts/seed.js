/**
 * Seed demo users + a site with chargers and tenant companies.
 * Usage: npm run seed --prefix backend
 *
 * Auth is Google OAuth (or demo-role login when ALLOW_DEMO_AUTH=true).
 * Seeded users match demo emails so Google / demo login maps to roles.
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
  ])

  // Tight grid limit so concurrent sessions visibly throttle under demand
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

  await User.create([
    {
      name: 'Platform Admin',
      email: 'admin@example.com',
      picture: '',
      googleId: 'demo-admin',
      role: 'admin',
      tenantId: null,
    },
    {
      name: 'Tenant Alpha Manager',
      email: 'tenant1@example.com',
      picture: '',
      googleId: 'demo-tenant_manager',
      role: 'tenant_manager',
      tenantId: tenantA._id,
    },
    {
      name: 'Tenant Beta Manager',
      email: 'tenant2@example.com',
      picture: '',
      googleId: 'demo-tenant2',
      role: 'tenant_manager',
      tenantId: tenantB._id,
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
  console.log('[seed] Google OAuth users ready:')
  console.log('[seed]   admin@example.com  → admin (demo Admin button)')
  console.log('[seed]   tenant1@example.com → Alpha tenant_manager')
  console.log('[seed]   tenant2@example.com → Beta tenant_manager')
  console.log('[seed] Tip: set GOOGLE_CLIENT_ID + ADMIN_EMAILS for real Google login')
  console.log('[seed] done')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
