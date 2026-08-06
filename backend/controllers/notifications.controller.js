const Notification = require('../models/Notification')

async function listNotifications(req, res) {
  try {
    const filter = {}

    if (req.user.role === 'tenant_manager') {
      if (!req.user.tenantId) {
        return res.status(403).json({ status: 'error', message: 'No tenant linked' })
      }
      filter.tenantId = req.user.tenantId
    } else if (req.user.role === 'admin') {
      if (req.query.tenantId) filter.tenantId = req.query.tenantId
    } else {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }

    if (req.query.unread === 'true') {
      filter.read = false
    }

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
    if (req.user.role === 'tenant_manager') {
      filter.tenantId = req.user.tenantId
    }

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
    const filter = { read: false }
    if (req.user.role === 'tenant_manager') {
      filter.tenantId = req.user.tenantId
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }

    await Notification.updateMany(filter, { read: true })
    return res.json({ status: 'ok', message: 'All marked read' })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to mark read' })
  }
}

module.exports = { listNotifications, markRead, markAllRead }
