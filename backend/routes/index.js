const express = require('express')
const healthRoutes = require('./health.routes')
const authRoutes = require('./auth.routes')
const sitesRoutes = require('./sites.routes')
const chargersRoutes = require('./chargers.routes')
const tenantsRoutes = require('./tenants.routes')
const vehiclesRoutes = require('./vehicles.routes')
const sessionsRoutes = require('./sessions.routes')
const billingRoutes = require('./billing.routes')

const router = express.Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/sites', sitesRoutes)
router.use('/chargers', chargersRoutes)
router.use('/tenants', tenantsRoutes)
router.use('/vehicles', vehiclesRoutes)
router.use('/sessions', sessionsRoutes)
router.use('/billing', billingRoutes)

module.exports = router
