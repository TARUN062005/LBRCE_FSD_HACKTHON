const express = require('express')
const {
  listMyStations,
  createStation,
  updateStation,
  setStationStatus,
  listTenantBookings,
  tenantEarnings,
  registerCompany,
  setTenantStatus,
} = require('../controllers/marketplace.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.post('/register-company', verifyToken, requireRole('normal_user', 'admin'), registerCompany)

router.get(
  '/stations',
  verifyToken,
  requireRole('tenant_manager'),
  listMyStations,
)
router.post(
  '/stations',
  verifyToken,
  requireRole('tenant_manager'),
  createStation,
)
router.patch(
  '/stations/:id',
  verifyToken,
  requireRole('tenant_manager', 'admin'),
  updateStation,
)

router.get(
  '/bookings',
  verifyToken,
  requireRole('tenant_manager'),
  listTenantBookings,
)
router.get(
  '/earnings',
  verifyToken,
  requireRole('tenant_manager'),
  tenantEarnings,
)

router.patch(
  '/stations/:id/status',
  verifyToken,
  requireRole('admin'),
  setStationStatus,
)
router.patch(
  '/tenants/:id/status',
  verifyToken,
  requireRole('admin'),
  setTenantStatus,
)

module.exports = router
