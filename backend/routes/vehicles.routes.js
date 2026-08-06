const express = require('express')
const {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicles.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const { requireTenantContext } = require('../middleware/tenant.middleware')

const router = express.Router()

router.use(verifyToken, requireTenantContext)

router.get('/', listVehicles)
router.post('/', createVehicle)
router.get('/:id', getVehicle)
router.patch('/:id', updateVehicle)
router.delete('/:id', deleteVehicle)

module.exports = router
