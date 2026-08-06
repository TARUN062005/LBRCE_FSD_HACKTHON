const express = require('express')
const {
  quote,
  demoCheckout,
  demoCancel,
  checkout,
} = require('../controllers/payments.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken, requireRole('normal_user'))

router.post('/quote', quote)
router.post('/demo-checkout', demoCheckout)
router.post('/demo-cancel', demoCancel)
router.post('/checkout', checkout)

module.exports = router
