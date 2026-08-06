const User = require('../models/User')
const Tenant = require('../models/Tenant')

async function tenantNameMap(ids) {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))]
  if (!unique.length) return {}
  const tenants = await Tenant.find({ _id: { $in: unique } }).select('companyName')
  return Object.fromEntries(tenants.map((t) => [t._id.toString(), t.companyName]))
}

function parseTenantIds(body) {
  const raw = body?.tenantIds ?? (body?.tenantId ? [body.tenantId] : [])
  const list = Array.isArray(raw) ? raw : [raw]
  return [...new Set(list.map(String).filter(Boolean))]
}

/**
 * GET /users?role=&page=1&limit=10&q=
 * Paginated, role-filtered admin user list.
 */
async function listUsers(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const role = String(req.query.role || '').trim()
    const q = String(req.query.q || '').trim()

    const filter = {}
    if (role && ['normal_user', 'tenant_manager', 'admin'].includes(role)) {
      filter.role = role
    }
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ name: rx }, { email: rx }]
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ])

    const allTenantIds = users.flatMap((u) => {
      u.syncTenantFields()
      return [...(u.tenantIds || []), u.tenantId].filter(Boolean)
    })
    const names = await tenantNameMap(allTenantIds)

    return res.json({
      status: 'ok',
      data: users.map((u) => u.toSafeJSON(names)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('[users] list error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to list users' })
  }
}

/** GET /users/pending — first page of normal_users (compat) */
async function listPending(req, res) {
  req.query = { ...req.query, role: 'normal_user', page: req.query.page || 1, limit: req.query.limit || 10 }
  return listUsers(req, res)
}

/**
 * PATCH /users/:id/promote
 * Body: { tenantIds: string[] } or { tenantId }
 */
async function promote(req, res) {
  try {
    const tenantIds = parseTenantIds(req.body || {})
    if (!tenantIds.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Select at least one company (tenantIds)',
      })
    }

    if (req.params.id === req.user.userId) {
      return res.status(400).json({ status: 'error', message: 'Cannot promote yourself' })
    }

    const tenants = await Tenant.find({ _id: { $in: tenantIds } })
    if (tenants.length !== tenantIds.length) {
      return res.status(404).json({ status: 'error', message: 'One or more companies not found' })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
    }
    if (user.role === 'admin') {
      return res.status(400).json({ status: 'error', message: 'Cannot promote an admin' })
    }

    user.role = 'tenant_manager'
    user.tenantIds = tenantIds
    user.tenantId = tenantIds[0]
    user.syncTenantFields()
    await user.save()

    const names = await tenantNameMap(user.tenantIds)
    return res.json({ status: 'ok', user: user.toSafeJSON(names) })
  } catch (err) {
    console.error('[users] promote error:', err)
    return res.status(500).json({ status: 'error', message: err.message || 'Promote failed' })
  }
}

/**
 * PATCH /users/:id/tenants — edit company assignment for a tenant manager
 * Body: { tenantIds: string[] }
 */
async function updateTenants(req, res) {
  try {
    const tenantIds = parseTenantIds(req.body || {})
    if (!tenantIds.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Select at least one company',
      })
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
    }
    if (user.role !== 'tenant_manager') {
      return res.status(400).json({
        status: 'error',
        message: 'Only tenant managers have company assignments',
      })
    }

    const tenants = await Tenant.find({ _id: { $in: tenantIds } })
    if (tenants.length !== tenantIds.length) {
      return res.status(404).json({ status: 'error', message: 'One or more companies not found' })
    }

    user.tenantIds = tenantIds
    user.tenantId = tenantIds[0]
    user.syncTenantFields()
    await user.save()

    const names = await tenantNameMap(user.tenantIds)
    return res.json({ status: 'ok', user: user.toSafeJSON(names) })
  } catch (err) {
    console.error('[users] updateTenants error:', err)
    return res.status(500).json({ status: 'error', message: err.message || 'Update failed' })
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
    user.tenantIds = []
    await user.save()

    return res.json({ status: 'ok', user: user.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message || 'Demote failed' })
  }
}

module.exports = { listUsers, listPending, promote, demote, updateTenants }
