const express = require('express')
const { listBilling, getInvoice } = require('../controllers/billing.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken, requireRole('admin', 'tenant_manager'))

router.get('/', listBilling)
router.get('/:invoiceId', getInvoice)

module.exports = router
