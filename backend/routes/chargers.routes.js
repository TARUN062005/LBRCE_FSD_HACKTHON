const express = require('express')
const {
  listChargers,
  getCharger,
  createCharger,
  updateCharger,
  deleteCharger,
} = require('../controllers/chargers.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken, requireRole('admin'))

router.get('/', listChargers)
router.post('/', createCharger)
router.get('/:id', getCharger)
router.patch('/:id', updateCharger)
router.delete('/:id', deleteCharger)

module.exports = router
