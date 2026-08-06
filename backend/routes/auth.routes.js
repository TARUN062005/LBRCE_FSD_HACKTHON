const express = require('express')
const {
  googleConfig,
  googleCallback,
  me,
  updateProfile,
  removePhoto,
  resetIncompleteProfile,
  logout,
} = require('../controllers/auth.controller')
const { verifyToken } = require('../middleware/auth.middleware')

const router = express.Router()

router.get('/google', googleConfig)
router.post('/google/callback', googleCallback)
router.get('/me', verifyToken, me)
router.patch('/profile', verifyToken, updateProfile)
router.delete('/profile/photo', verifyToken, removePhoto)
router.post('/profile/reset-incomplete', verifyToken, resetIncompleteProfile)
router.post('/logout', verifyToken, logout)

module.exports = router
