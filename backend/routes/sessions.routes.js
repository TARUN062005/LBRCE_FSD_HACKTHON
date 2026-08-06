const express = require('express')
const {
  listSessions,
  listPlugInOptions,
  startSession,
  stopSession,
  adjustSession,
} = require('../controllers/sessions.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

const router = express.Router()

router.use(verifyToken)

router.get('/', requireRole('admin', 'tenant_manager'), listSessions)
router.get('/options', requireRole('tenant_manager'), listPlugInOptions)
router.post('/start', requireRole('tenant_manager'), startSession)
router.post('/stop', requireRole('admin', 'tenant_manager'), stopSession)
router.patch('/:id/adjust', requireRole('admin', 'tenant_manager'), adjustSession)

module.exports = router
