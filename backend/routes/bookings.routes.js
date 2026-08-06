const express = require('express')
const {
  createBooking,
  listBookings,
  cancelBooking,
  approveBooking,
} = require('../controllers/bookings.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken)

router.post('/create', requireRole('normal_user'), createBooking)
router.get('/', requireRole('normal_user', 'admin'), listBookings)
router.patch('/cancel', requireRole('normal_user', 'admin'), cancelBooking)
router.patch('/:id/cancel', requireRole('normal_user', 'admin'), cancelBooking)
router.patch('/:id/approve', requireRole('admin'), approveBooking)

module.exports = router
