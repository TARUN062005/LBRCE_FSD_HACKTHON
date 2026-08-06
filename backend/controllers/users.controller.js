const User = require('../models/User')
const Tenant = require('../models/Tenant')

/** GET /users — all users (admin) */
async function listUsers(_req, res) {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(500)
    return res.json({ status: 'ok', data: users.map((u) => u.toSafeJSON()) })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to list users' })
  }
}

/** GET /users/pending — normal_users (candidates for promotion) */
async function listPending(_req, res) {
  try {
    const users = await User.find({ role: 'normal_user' }).sort({ createdAt: -1 }).limit(500)
    return res.json({ status: 'ok', data: users.map((u) => u.toSafeJSON()) })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to list pending users' })
  }
}

/**
 * PATCH /users/:id/promote
 * Body: { tenantId }
 * normal_user → tenant_manager
 */
async function promote(req, res) {
  try {
    const { tenantId } = req.body || {}
    if (!tenantId) {
      return res.status(400).json({ status: 'error', message: 'tenantId is required' })
    }

    if (req.params.id === req.user.userId) {
      return res.status(400).json({ status: 'error', message: 'Cannot promote yourself' })
    }

    const tenant = await Tenant.findById(tenantId)
    if (!tenant) {
      return res.status(404).json({ status: 'error', message: 'Tenant not found' })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
    }
    if (user.role === 'admin') {
      return res.status(400).json({ status: 'error', message: 'Cannot promote an admin' })
    }

    user.role = 'tenant_manager'
    user.tenantId = tenant._id
    await user.save()

    return res.json({ status: 'ok', user: user.toSafeJSON() })
  } catch (err) {
    console.error('[users] promote error:', err)
    return res.status(500).json({ status: 'error', message: err.message || 'Promote failed' })
  }
}

/**
 * PATCH /users/:id/demote
 * tenant_manager → normal_user
 */
async function demote(req, res) {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ status: 'error', message: 'Cannot demote yourself' })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
    }
    if (user.role === 'admin') {
      return res.status(400).json({ status: 'error', message: 'Cannot demote an admin' })
    }

    user.role = 'normal_user'
    user.tenantId = null
    await user.save()

    return res.json({ status: 'ok', user: user.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message || 'Demote failed' })
  }
}

module.exports = { listUsers, listPending, promote, demote }
