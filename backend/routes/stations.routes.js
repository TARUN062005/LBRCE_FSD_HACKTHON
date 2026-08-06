const express = require('express')
const {
  listStations,
  getStation,
  getAvailability,
} = require('../controllers/stations.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

// Stations catalog: public read (landing + user search)
router.get('/', listStations)
router.get('/availability', getAvailability)
router.get('/:id', getStation)

// Alias mounted also as /availability at index for ROLE_WORKFLOW path
module.exports = router
module.exports.availabilityRouter = (() => {
  const r = express.Router()
  r.get('/', getAvailability)
  return r
})()
