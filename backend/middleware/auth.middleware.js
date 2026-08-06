const jwt = require('jsonwebtoken')
const env = require('../config/env')
const User = require('../models/User')

/**
 * Verify Bearer JWT and attach req.user = { userId, role, tenantId }.
 */
async function verifyToken(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' })
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET)
    const user = await User.findById(payload.userId).select('_id role tenantId')

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User no longer exists' })
    }

    req.user = {
      userId: user._id.toString(),
      email: payload.email || null,
      name: payload.name || null,
      picture: payload.picture || '',
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
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

module.exports = { verifyToken, requireRole }
