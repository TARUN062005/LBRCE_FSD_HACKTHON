const express = require('express')
const {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
} = require('../controllers/tenants.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken, requireRole('admin'))

router.get('/', listTenants)
router.post('/', createTenant)
router.get('/:id', getTenant)
router.patch('/:id', updateTenant)
router.delete('/:id', deleteTenant)

module.exports = router
