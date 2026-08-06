/**
 * Seed one admin and two tenant managers.
 * Usage: npm run seed --prefix backend
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const connectDB = require('../config/db')
const User = require('../models/User')

const TENANT_A = new mongoose.Types.ObjectId()
const TENANT_B = new mongoose.Types.ObjectId()

const SEED_USERS = [
  {
    name: 'Platform Admin',
    email: 'admin@example.com',
    password: 'Admin@123',
    role: 'admin',
    tenantId: null,
  },
  {
    name: 'Tenant Alpha Manager',
    email: 'tenant1@example.com',
    password: 'Tenant@123',
    role: 'tenant_manager',
    tenantId: TENANT_A,
  },
  {
    name: 'Tenant Beta Manager',
    email: 'tenant2@example.com',
    password: 'Tenant@123',
    role: 'tenant_manager',
    tenantId: TENANT_B,
  },
]

async function seed() {
  await connectDB()

  console.log('[seed] clearing users collection…')
  await User.deleteMany({})

  for (const entry of SEED_USERS) {
    const passwordHash = await bcrypt.hash(entry.password, 10)
    const user = await User.create({
      name: entry.name,
      email: entry.email,
      passwordHash,
      role: entry.role,
      tenantId: entry.tenantId,
    })
    console.log(
      `[seed] ${user.role.padEnd(16)} ${user.email}  tenantId=${user.tenantId || '—'}  password=${entry.password}`,
    )
  }

  console.log('[seed] done')
  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
