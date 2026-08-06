const express = require('express')
const {
  listNotifications,
  markRead,
  markAllRead,
} = require('../controllers/notifications.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken, requireRole('admin', 'tenant_manager'))

router.get('/', listNotifications)
router.patch('/read-all', markAllRead)
router.patch('/:id/read', markRead)

module.exports = router
