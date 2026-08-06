const express = require('express')
const { getDashboard } = require('../controllers/dashboard.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken, requireRole('admin', 'tenant_manager'))
router.get('/', getDashboard)

module.exports = router
