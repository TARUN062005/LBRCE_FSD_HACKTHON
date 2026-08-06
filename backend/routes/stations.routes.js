const express = require('express')
const {
  listStations,
  getStation,
  getAvailability,
  nearbyStations,
} = require('../controllers/stations.controller')
const { listRatings, createRating } = require('../controllers/ratings.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.get('/', listStations)
router.get('/nearby', nearbyStations)
router.get('/availability', getAvailability)
router.get('/:id/ratings', listRatings)
router.post('/:id/ratings', verifyToken, requireRole('normal_user'), (req, res, next) => {
  req.body.siteId = req.params.id
  return createRating(req, res, next)
})
router.get('/:id', getStation)

module.exports = router
module.exports.availabilityRouter = (() => {
  const r = express.Router()
  r.get('/', getAvailability)
  return r
})()
