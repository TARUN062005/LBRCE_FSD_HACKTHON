const express = require('express')
const {
  listUsers,
  listPending,
  promote,
  demote,
} = require('../controllers/users.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken, requireRole('admin'))

router.get('/pending', listPending)
router.get('/', listUsers)
router.patch('/:id/promote', promote)
router.patch('/:id/demote', demote)

module.exports = router
