const Notification = require('../models/Notification')

function scopeFilter(req) {
  if (req.user.role === 'tenant_manager') {
    if (!req.user.tenantId) return { error: 'No tenant linked' }
    return { filter: { tenantId: req.user.tenantId } }
  }
  if (req.user.role === 'admin') {
    const filter = {}
    if (req.query.tenantId) filter.tenantId = req.query.tenantId
    return { filter }
  }
  if (req.user.role === 'normal_user') {
    return { filter: { userId: req.user.userId } }
  }
  return { error: 'Insufficient permissions' }
}

async function listNotifications(req, res) {
  try {
    const scoped = scopeFilter(req)
    if (scoped.error) {
      return res.status(403).json({ status: 'error', message: scoped.error })
    }
    const filter = { ...scoped.filter }
    if (req.query.unread === 'true') filter.read = false

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)

    const unreadCount = await Notification.countDocuments({
      ...filter,
      read: false,
    })

    return res.json({
      status: 'ok',
      data: {
        notifications: notifications.map((n) => n.toSafeJSON()),
        unreadCount,
      },
    })
  } catch (err) {
    console.error('[notifications] list error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to load notifications' })
  }
}

async function markRead(req, res) {
  try {
    const filter = { _id: req.params.id }
    if (req.user.role === 'tenant_manager') filter.tenantId = req.user.tenantId
    if (req.user.role === 'normal_user') filter.userId = req.user.userId

    const doc = await Notification.findOneAndUpdate(
      filter,
      { read: true },
      { returnDocument: 'after' },
    )

    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Notification not found' })
    }

    return res.json({ status: 'ok', data: doc.toSafeJSON() })
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid notification id' })
  }
}

async function markAllRead(req, res) {
  try {
    const scoped = scopeFilter(req)
    if (scoped.error) {
      return res.status(403).json({ status: 'error', message: scoped.error })
    }

    await Notification.updateMany({ ...scoped.filter, read: false }, { read: true })
    return res.json({ status: 'ok', message: 'All marked read' })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to mark read' })
  }
}

module.exports = { listNotifications, markRead, markAllRead }
