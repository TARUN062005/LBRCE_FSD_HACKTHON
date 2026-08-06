/**
 * Seed fake marketplace stations around Mylavaram & Vijayawada (Andhra Pradesh).
 *
 * Creates Tenant company documents (no User accounts) so stations have tenantId
 * for booking notifications once a real manager is promoted via Google OAuth.
 *
 * Does NOT seed: admin, tenant_manager, or normal_user accounts.
 *
 *   npm run seed:stations
 *   node scripts/seedMarketplaceStations.js
 */
require('../config/env')
const mongoose = require('mongoose')
const env = require('../config/env')
const Site = require('../models/Site')
const Charger = require('../models/Charger')
const Tenant = require('../models/Tenant')

const AMENITIES = ['Parking', 'Washroom', 'Cafe', 'WiFi', 'Rest area']

const PHOTO = (label) =>
  `https://placehold.co/800x450/0f766e/ffffff/png?text=${encodeURIComponent(label)}`

const SEED = [
  // —— Mylavaram (~16.7833, 80.6333) ——
  {
    stationName: 'Mylavaram EV Hub',
    tenantName: 'Mylavaram Charge Co',
    address: 'NH-65 Frontage Road, Mylavaram',
    city: 'Mylavaram',
    state: 'Andhra Pradesh',
    pincode: '521230',
    latitude: 16.7841,
    longitude: 80.6318,
    numberOfChargers: 4,
    pricePerKwh: 2.2,
    rating: 4.6,
    openingTime: '06:00',
    closingTime: '23:00',
    amenities: AMENITIES,
  },
  {
    stationName: 'GreenCharge Station',
    tenantName: 'GreenCharge AP',
    address: 'College Road Junction, Mylavaram',
    city: 'Mylavaram',
    state: 'Andhra Pradesh',
    pincode: '521230',
    latitude: 16.7812,
    longitude: 80.6355,
    numberOfChargers: 3,
    pricePerKwh: 2.0,
    rating: 4.4,
    openingTime: '07:00',
    closingTime: '22:00',
    amenities: ['Parking', 'Washroom', 'WiFi'],
  },
  {
    stationName: 'Krishna Fast Charge',
    tenantName: 'Krishna EV Networks',
    address: 'Near Krishna River Bridge Approach, Mylavaram',
    city: 'Mylavaram',
    state: 'Andhra Pradesh',
    pincode: '521230',
    latitude: 16.7865,
    longitude: 80.6292,
    numberOfChargers: 5,
    pricePerKwh: 2.4,
    rating: 4.7,
    openingTime: '00:00',
    closingTime: '23:59',
    amenities: ['Parking', 'Cafe', 'WiFi', 'Rest area'],
  },
  {
    stationName: 'Highway Charge Point',
    tenantName: 'AP Highway Charge',
    address: 'Hyderabad–Vijayawada Highway, Mylavaram Bypass',
    city: 'Mylavaram',
    state: 'Andhra Pradesh',
    pincode: '521230',
    latitude: 16.7798,
    longitude: 80.6381,
    numberOfChargers: 6,
    pricePerKwh: 2.3,
    rating: 4.3,
    openingTime: '05:00',
    closingTime: '23:30',
    amenities: AMENITIES,
  },
  {
    stationName: 'EV Connect Mylavaram',
    tenantName: 'EV Connect India',
    address: 'Bus Stand Circle, Mylavaram',
    city: 'Mylavaram',
    state: 'Andhra Pradesh',
    pincode: '521230',
    latitude: 16.7825,
    longitude: 80.6348,
    numberOfChargers: 3,
    pricePerKwh: 1.8,
    rating: 4.2,
    openingTime: '08:00',
    closingTime: '21:00',
    amenities: ['Parking', 'Washroom', 'WiFi'],
  },
  // —— Vijayawada (~16.5062, 80.6480) ——
  {
    stationName: 'Vijayawada SuperCharge',
    tenantName: 'Vijayawada SuperCharge Pvt Ltd',
    address: 'Near Railway Station North Gate, Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    pincode: '520001',
    latitude: 16.5185,
    longitude: 80.6204,
    numberOfChargers: 8,
    pricePerKwh: 2.5,
    rating: 4.8,
    openingTime: '00:00',
    closingTime: '23:59',
    amenities: AMENITIES,
  },
  {
    stationName: 'Benz Circle EV Hub',
    tenantName: 'Benz Circle Mobility',
    address: 'Benz Circle, MG Road Corridor, Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    pincode: '520010',
    latitude: 16.5035,
    longitude: 80.6468,
    numberOfChargers: 5,
    pricePerKwh: 2.4,
    rating: 4.5,
    openingTime: '06:00',
    closingTime: '23:00',
    amenities: ['Parking', 'Cafe', 'WiFi', 'Rest area'],
  },
  {
    stationName: 'MG Road Charging Point',
    tenantName: 'MG Road Charge Hub',
    address: 'MG Road, Near Eluru Road Junction, Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    pincode: '520002',
    latitude: 16.5088,
    longitude: 80.6412,
    numberOfChargers: 4,
    pricePerKwh: 2.1,
    rating: 4.4,
    openingTime: '07:00',
    closingTime: '22:30',
    amenities: ['Parking', 'Washroom', 'WiFi'],
  },
  {
    stationName: 'GreenVolt Station',
    tenantName: 'GreenVolt Andhra',
    address: 'Auto Nagar Industrial Area, Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    pincode: '520007',
    latitude: 16.4952,
    longitude: 80.6621,
    numberOfChargers: 6,
    pricePerKwh: 1.9,
    rating: 4.1,
    openingTime: '06:30',
    closingTime: '22:00',
    amenities: ['Parking', 'Washroom', 'Cafe', 'Rest area'],
  },
  {
    stationName: 'FastCharge Vijayawada',
    tenantName: 'FastCharge Coastal',
    address: 'Near Kanaka Durga Temple Road, Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    pincode: '520001',
    latitude: 16.5122,
    longitude: 80.6315,
    numberOfChargers: 4,
    pricePerKwh: 2.2,
    rating: 4.6,
    openingTime: '05:30',
    closingTime: '23:00',
    amenities: AMENITIES,
  },
]

async function ensureTenant(tenantName) {
  let tenant = await Tenant.findOne({ companyName: tenantName })
  if (!tenant) {
    tenant = await Tenant.create({
      companyName: tenantName,
      billingPlan: 'standard',
      siteId: null,
      status: 'approved',
      description: `Demo host company for ${tenantName} (no user accounts seeded)`,
    })
  } else if (tenant.status !== 'approved') {
    tenant.status = 'approved'
    await tenant.save()
  }
  return tenant
}

async function upsertStation(row) {
  const tenant = await ensureTenant(row.tenantName)
  const locationLine = `${row.address}, ${row.city}, ${row.state} ${row.pincode}`

  let site = await Site.findOne({ name: row.stationName })
  if (!site) {
    site = new Site({
      name: row.stationName,
      location: locationLine,
      address: row.address,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      description: `Demo EV station — ${row.stationName}`,
      photos: [PHOTO(row.stationName)],
      amenities: row.amenities,
      tenantName: row.tenantName,
      pricePerKwh: row.pricePerKwh,
      maxCapacityKw: Math.max(40, row.numberOfChargers * 22),
      tenantId: tenant._id,
      status: 'approved',
      workingHours: { open: row.openingTime, close: row.closingTime },
      ratingAvg: row.rating,
      ratingCount: 12 + Math.floor(row.rating * 10),
    })
  } else {
    site.location = locationLine
    site.address = row.address
    site.city = row.city
    site.state = row.state
    site.pincode = row.pincode
    site.amenities = row.amenities
    site.tenantName = row.tenantName
    site.pricePerKwh = row.pricePerKwh
    site.tenantId = tenant._id
    site.status = 'approved'
    site.workingHours = { open: row.openingTime, close: row.closingTime }
    site.ratingAvg = row.rating
    if (!site.photos?.length) site.photos = [PHOTO(row.stationName)]
  }

  site.setCoordinates(row.latitude, row.longitude)
  await site.save()

  if (!tenant.siteId) {
    tenant.siteId = site._id
    await tenant.save()
  }

  const existing = await Charger.countDocuments({ siteId: site._id })
  if (existing === 0) {
    const chargers = []
    for (let i = 0; i < row.numberOfChargers; i += 1) {
      const isDc = i % 3 === 0
      chargers.push({
        siteId: site._id,
        label: `Pole ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
        maxPowerKw: isDc ? 50 : 22,
        chargerType: isDc ? 'CCS' : 'Type2',
        status: 'available',
      })
    }
    await Charger.insertMany(chargers)
  }

  const available = await Charger.countDocuments({ siteId: site._id, status: 'available' })
  const total = await Charger.countDocuments({ siteId: site._id })

  console.log(
    `✓ ${row.stationName} · ${row.city} · ${row.latitude},${row.longitude} · ${available}/${total} free · ₹${row.pricePerKwh}/kWh`,
  )
  return site
}

async function main() {
  if (!env.MONGO_URI) {
    console.error('MONGO_URI missing')
    process.exit(1)
  }
  await mongoose.connect(env.MONGO_URI)
  console.log(`Seeding ${SEED.length} stations (Mylavaram + Vijayawada)…`)
  console.log('No users will be created.\n')

  for (const row of SEED) {
    await upsertStation(row)
  }

  await mongoose.disconnect()
  console.log('\nDone. Map discovery works once Google OAuth users exist.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
