const express = require('express')
const {
  googleConfig,
  googleCallback,
  me,
  logout,
  promote,
  listUsers,
} = require('../controllers/auth.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.get('/google', googleConfig)
router.post('/google/callback', googleCallback)
router.get('/me', verifyToken, me)
router.post('/logout', verifyToken, logout)
router.get('/users', verifyToken, requireRole('admin'), listUsers)
router.patch('/promote', verifyToken, requireRole('admin'), promote)

module.exports = router
