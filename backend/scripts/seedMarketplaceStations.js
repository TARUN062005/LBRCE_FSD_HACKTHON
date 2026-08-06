/**
 * Optional marketplace demo stations with coordinates (Hyderabad area).
 * Does not create users. Safe to re-run (upserts by name).
 *
 *   node scripts/seedMarketplaceStations.js
 */
require('../config/env')
const mongoose = require('mongoose')
const env = require('../config/env')
const Site = require('../models/Site')
const Charger = require('../models/Charger')

const SEED = [
  {
    name: 'GreenCharge Jubilee Hills',
    address: 'Road No. 36, Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500033',
    lat: 17.4326,
    lng: 78.4071,
    pricePerKwh: 0.16,
  },
  {
    name: 'FastCharge Hitech City',
    address: 'Cyber Towers, Hitech City',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    lat: 17.4483,
    lng: 78.3915,
    pricePerKwh: 0.18,
  },
  {
    name: 'EVHub Gachibowli',
    address: 'Financial District, Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500032',
    lat: 17.4401,
    lng: 78.3489,
    pricePerKwh: 0.14,
  },
]

async function main() {
  await mongoose.connect(env.MONGO_URI)
  for (const row of SEED) {
    let site = await Site.findOne({ name: row.name })
    if (!site) {
      site = new Site({
        name: row.name,
        location: `${row.address}, ${row.city}`,
        address: row.address,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        description: 'Demo marketplace charging station',
        pricePerKwh: row.pricePerKwh,
        maxCapacityKw: 60,
        status: 'approved',
        ratingAvg: 4.4,
        ratingCount: 3,
      })
    }
    site.setCoordinates(row.lat, row.lng)
    site.status = 'approved'
    site.pricePerKwh = row.pricePerKwh
    await site.save()

    const count = await Charger.countDocuments({ siteId: site._id })
    if (count === 0) {
      await Charger.create([
        { siteId: site._id, label: 'Pole A1', maxPowerKw: 22, chargerType: 'Type2', status: 'available' },
        { siteId: site._id, label: 'Pole A2', maxPowerKw: 50, chargerType: 'CCS', status: 'available' },
      ])
    }
    console.log('✓', site.name, site.latitude, site.longitude)
  }
  await mongoose.disconnect()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
