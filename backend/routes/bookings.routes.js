const express = require('express')
const {
  createBooking,
  listBookings,
  history,
  cancelBooking,
  approveBooking,
  startCharging,
  completeCharging,
} = require('../controllers/bookings.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken)

router.post('/create', requireRole('normal_user'), createBooking)
router.get('/history', requireRole('normal_user', 'admin'), history)
router.get('/', requireRole('normal_user', 'admin'), listBookings)
router.patch('/cancel', requireRole('normal_user', 'admin'), cancelBooking)
router.patch('/:id/cancel', requireRole('normal_user', 'admin'), cancelBooking)
router.patch('/:id/approve', requireRole('admin'), approveBooking)
router.post('/:id/start', requireRole('normal_user', 'admin'), startCharging)
router.post('/:id/complete', requireRole('normal_user', 'admin'), completeCharging)

module.exports = router
