const jwt = require('jsonwebtoken')
const env = require('../config/env')
const User = require('../models/User')

/**
 * Verify Bearer JWT and attach req.user = { userId, role, tenantId, tenantIds }.
 */
async function verifyToken(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' })
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET)
    const user = await User.findById(payload.userId).select('_id role tenantId tenantIds')

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User no longer exists' })
    }

    user.syncTenantFields()
    const tenantIds = (user.tenantIds || []).map((id) => id.toString())

    req.user = {
      userId: user._id.toString(),
      email: payload.email || null,
      name: payload.name || null,
      picture: payload.picture || '',
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      tenantIds,
    }
    return next()
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' })
  }
}

/**
 * Role guard — usage: requireRole('admin') or requireRole('admin', 'tenant_manager')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }
    return next()
  }
}

/** All company IDs a manager can operate */
function managedTenantIds(req) {
  if (req.user?.tenantIds?.length) return req.user.tenantIds.map(String)
  if (req.user?.tenantId) return [String(req.user.tenantId)]
  return []
}

function ownsTenant(req, tenantId) {
  if (!tenantId) return false
  return managedTenantIds(req).includes(String(tenantId))
}

module.exports = { verifyToken, requireRole, managedTenantIds, ownsTenant }
