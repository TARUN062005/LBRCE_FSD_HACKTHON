/**
 * One-shot smoke: fake Razorpay quote → checkout → tenant approve.
 * Run: node scripts/verifyPaymentFlow.js
 */
require('../config/env')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const env = require('../config/env')
const User = require('../models/User')
const Site = require('../models/Site')
const Charger = require('../models/Charger')
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')

const BASE = process.env.SMOKE_API || 'http://localhost:5000/api'

function tokenFor(user) {
  const tenantIds = (user.tenantIds || []).map((id) => id.toString())
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      tenantIds,
    },
    env.JWT_SECRET,
    { expiresIn: '1h' },
  )
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function main() {
  const results = []
  const pass = (name, detail) => {
    results.push({ name, ok: true, detail })
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
  }
  const fail = (name, err) => {
    results.push({ name, ok: false, detail: String(err) })
    console.error(`✗ ${name} — ${err}`)
  }

  await mongoose.connect(env.MONGO_URI)

  // Health
  try {
    const h = await api('GET', '/health')
    assert(h.status === 200 && h.json.status === 'ok', JSON.stringify(h.json))
    pass('API health')
  } catch (e) {
    fail('API health', e.message)
  }

  // No real Razorpay SDK in package
  try {
    const pkg = require('../package.json')
    assert(!pkg.dependencies?.razorpay, 'real razorpay package should not be installed')
    pass('No real Razorpay package', 'demo-only provider')
  } catch (e) {
    fail('No real Razorpay package', e.message)
  }

  // Ensure demo users
  let driver = await User.findOne({ email: 'smoke.driver@gridfleet.local' })
  if (!driver) {
    driver = await User.create({
      name: 'Smoke Driver',
      email: 'smoke.driver@gridfleet.local',
      role: 'normal_user',
      googleId: 'smoke-driver',
    })
  } else {
    driver.role = 'normal_user'
    driver.tenantId = null
    driver.tenantIds = []
    await driver.save()
  }

  const site = await Site.findOne({ status: 'approved', tenantId: { $ne: null } }).sort({
    createdAt: -1,
  })
  assert(site, 'No approved station with tenant found — run seed:stations')
  const charger = await Charger.findOne({ siteId: site._id, status: 'available' })
  assert(charger, 'No available charger on site')

  let host = await User.findOne({
    role: 'tenant_manager',
    $or: [{ tenantId: site.tenantId }, { tenantIds: site.tenantId }],
  })
  if (!host) {
    host = await User.findOne({ email: 'smoke.host@gridfleet.local' })
    if (!host) {
      host = await User.create({
        name: 'Smoke Host',
        email: 'smoke.host@gridfleet.local',
        role: 'tenant_manager',
        tenantId: site.tenantId,
        tenantIds: [site.tenantId],
        googleId: 'smoke-host',
      })
    } else {
      host.role = 'tenant_manager'
      host.tenantId = site.tenantId
      host.tenantIds = [site.tenantId]
      await host.save()
    }
  }

  const driverToken = tokenFor(driver)
  const hostToken = tokenFor(host)

  const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)

  // Clear overlapping smoke bookings on this charger window
  await Booking.deleteMany({
    chargerId: charger._id,
    startTime: { $lt: end },
    endTime: { $gt: start },
  })

  // Quote
  try {
    const q = await api('POST', '/payments/quote', driverToken, {
      siteId: site._id.toString(),
      chargerId: charger._id.toString(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration: 60,
    })
    assert(q.status === 200, `HTTP ${q.status} ${JSON.stringify(q.json)}`)
    assert(q.json.data?.totalAmount > 0, 'totalAmount missing')
    assert(q.json.data?.currency === 'INR', 'currency not INR')
    pass(
      'POST /payments/quote',
      `₹${q.json.data.totalAmount} (energy ₹${q.json.data.energyCost} + fee + GST)`,
    )
  } catch (e) {
    fail('POST /payments/quote', e.message)
  }

  // Cancel (no booking)
  try {
    const c = await api('POST', '/payments/demo-cancel', driverToken, {
      siteId: site._id.toString(),
      amount: 10,
      method: 'upi',
      reason: 'cancelled',
    })
    assert(c.status === 200, `HTTP ${c.status} ${JSON.stringify(c.json)}`)
    assert(c.json.data?.status === 'cancelled', 'status not cancelled')
    assert(String(c.json.data?.paymentId || '').startsWith('rzp_demo_'), 'bad paymentId')
    pass('POST /payments/demo-cancel', c.json.data.paymentId)
  } catch (e) {
    fail('POST /payments/demo-cancel', e.message)
  }

  // Demo checkout (fake Razorpay pay)
  let bookingId = null
  let paymentId = null
  try {
    const p = await api('POST', '/payments/demo-checkout', driverToken, {
      siteId: site._id.toString(),
      chargerId: charger._id.toString(),
      bookingDate: start.toISOString().slice(0, 10),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration: 60,
      method: 'upi',
    })
    assert(p.status === 201, `HTTP ${p.status} ${JSON.stringify(p.json)}`)
    assert(p.json.provider === 'razorpay_demo', 'provider not razorpay_demo')
    assert(p.json.data?.paymentStatus === 'paid', 'paymentStatus not paid')
    assert(p.json.data?.booking?.status === 'pending', 'booking not pending')
    assert(String(p.json.data?.paymentId || '').startsWith('rzp_demo_'), 'bad paymentId')
    assert(String(p.json.data?.orderId || '').startsWith('order_demo_'), 'bad orderId')
    bookingId = p.json.data.booking.id
    paymentId = p.json.data.paymentId

    const payDoc = await Payment.findOne({ paymentId })
    assert(payDoc && payDoc.status === 'paid', 'Payment doc missing/not paid')
    assert(payDoc.provider === 'razorpay_demo', 'Payment provider wrong')

    pass(
      'POST /payments/demo-checkout',
      `${paymentId} · booking ${bookingId} pending+paid · ₹${p.json.data.amount}`,
    )
  } catch (e) {
    fail('POST /payments/demo-checkout', e.message)
  }

  // Tenant sees booking + approve
  if (bookingId) {
    try {
      const list = await api('GET', '/marketplace/bookings', hostToken)
      assert(list.status === 200, `HTTP ${list.status} ${JSON.stringify(list.json)}`)
      const found = (list.json.data || []).find((b) => b.id === bookingId)
      assert(found, 'Host cannot see paid pending booking')
      pass('GET /marketplace/bookings', `host sees booking ${bookingId}`)
    } catch (e) {
      fail('GET /marketplace/bookings', e.message)
    }

    try {
      const a = await api('PATCH', `/bookings/${bookingId}/approve`, hostToken)
      assert(a.status === 200, `HTTP ${a.status} ${JSON.stringify(a.json)}`)
      assert(a.json.data?.status === 'approved', 'not approved')
      pass('PATCH /bookings/:id/approve', 'tenant approve works')
    } catch (e) {
      fail('PATCH /bookings/:id/approve', e.message)
    }

    try {
      const s = await api('POST', `/bookings/${bookingId}/start`, hostToken)
      assert(s.status === 200, `HTTP ${s.status} ${JSON.stringify(s.json)}`)
      assert(s.json.data?.status === 'charging', 'not charging')
      pass('POST /bookings/:id/start', 'charging started')
    } catch (e) {
      fail('POST /bookings/:id/start', e.message)
    }

    try {
      const done = await api('POST', `/bookings/${bookingId}/complete`, hostToken)
      assert(done.status === 200, `HTTP ${done.status} ${JSON.stringify(done.json)}`)
      assert(done.json.data?.status === 'completed', 'not completed')
      pass('POST /bookings/:id/complete', done.json.invoice ? 'invoice created' : 'completed')
    } catch (e) {
      fail('POST /bookings/:id/complete', e.message)
    }
  }

  // Stations nearby for map
  try {
    const near = await api(
      'GET',
      `/stations/nearby?lat=${site.latitude}&lng=${site.longitude}&radiusKm=20`,
      driverToken,
    )
    assert(near.status === 200, `HTTP ${near.status}`)
    assert((near.json.data || []).length > 0, 'no nearby stations')
    pass('GET /stations/nearby', `${near.json.data.length} stations`)
  } catch (e) {
    fail('GET /stations/nearby', e.message)
  }

  await mongoose.disconnect()

  const failed = results.filter((r) => !r.ok)
  console.log('\n—— Summary ——')
  console.log(`${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) {
    process.exitCode = 1
    failed.forEach((f) => console.error(`FAIL: ${f.name}: ${f.detail}`))
  } else {
    console.log('Fake Razorpay + booking flow OK. No real payments.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
