const express = require('express')
const { login, register, me } = require('../controllers/auth.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.post('/login', login)
router.post('/register', verifyToken, requireRole('admin'), register)
router.get('/me', verifyToken, me)

module.exports = router
