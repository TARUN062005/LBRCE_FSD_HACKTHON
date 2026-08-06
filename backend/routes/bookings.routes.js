const express = require('express')
const {
  createBooking,
  listBookings,
  history,
  cancelBooking,
  approveBooking,
  rejectBooking,
  startCharging,
  completeCharging,
  acceptOffer,
  rejectOffer,
} = require('../controllers/bookings.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken)

router.post('/create', requireRole('normal_user'), createBooking)
router.get('/history', requireRole('normal_user'), history)
router.get('/', requireRole('normal_user'), listBookings)
router.patch('/cancel', requireRole('normal_user', 'tenant_manager'), cancelBooking)
router.patch('/:id/cancel', requireRole('normal_user', 'tenant_manager'), cancelBooking)
router.patch('/:id/approve', requireRole('tenant_manager'), approveBooking)
router.patch('/:id/reject', requireRole('tenant_manager'), rejectBooking)
router.patch('/:id/accept-offer', requireRole('normal_user'), acceptOffer)
router.patch('/:id/reject-offer', requireRole('normal_user'), rejectOffer)
router.post('/:id/start', requireRole('tenant_manager'), startCharging)
router.post('/:id/complete', requireRole('tenant_manager'), completeCharging)

module.exports = router
