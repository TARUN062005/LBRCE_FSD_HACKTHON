const express = require('express')
const { listBilling, getInvoice, downloadPdf } = require('../controllers/billing.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken, requireRole('admin', 'tenant_manager', 'normal_user'))

router.get('/', listBilling)
router.get('/:invoiceId/pdf', downloadPdf)
router.get('/:invoiceId', getInvoice)

module.exports = router
