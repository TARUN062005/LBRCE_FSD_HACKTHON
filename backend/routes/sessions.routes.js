const express = require('express')
const {
  listSessions,
  listPlugInOptions,
  startSession,
  stopSession,
} = require('../controllers/sessions.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken)

router.get('/', requireRole('admin', 'tenant_manager'), listSessions)
router.get('/options', requireRole('tenant_manager'), listPlugInOptions)
router.post('/start', requireRole('tenant_manager'), startSession)
router.post('/stop', requireRole('admin', 'tenant_manager'), stopSession)

module.exports = router
