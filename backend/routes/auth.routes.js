const express = require('express')
const {
  googleConfig,
  googleCallback,
  me,
  logout,
} = require('../controllers/auth.controller')
const { verifyToken } = require('../middleware/auth.middleware')

const router = express.Router()

router.get('/google', googleConfig)
router.post('/google/callback', googleCallback)
router.get('/me', verifyToken, me)
router.post('/logout', verifyToken, logout)

module.exports = router
