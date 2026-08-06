const express = require('express')
const { checkout } = require('../controllers/payments.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.post(
  '/checkout',
  verifyToken,
  requireRole('normal_user'),
  checkout,
)

module.exports = router
