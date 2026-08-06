const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const env = require('../config/env')
const User = require('../models/User')
const Tenant = require('../models/Tenant')
const { verifyGoogleIdToken } = require('../services/googleAuth.service')

const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '7d'

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture || '',
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
    },
    env.JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  )
}

/** GET /auth/google — public OAuth config for the frontend GIS button */
function googleConfig(_req, res) {
  return res.json({
    status: 'ok',
    data: {
      clientId: env.GOOGLE_CLIENT_ID || null,
      demoAuth: env.ALLOW_DEMO_AUTH,
      configured: Boolean(env.GOOGLE_CLIENT_ID),
    },
  })
}

async function resolveRoleAndTenant(email, requestedRole) {
  const existing = await User.findOne({ email })
  if (existing) {
    return { role: existing.role, tenantId: existing.tenantId }
  }

  const isAdminEmail = env.ADMIN_EMAILS.includes(email)
  let role = requestedRole
  if (!role) {
    role = isAdminEmail ? 'admin' : 'tenant_manager'
  }
  if (!['admin', 'tenant_manager'].includes(role)) {
    role = 'tenant_manager'
  }

  let tenantId = null
  if (role === 'tenant_manager') {
    const tenant = await Tenant.findOne().sort({ createdAt: 1 })
    tenantId = tenant?._id || new mongoose.Types.ObjectId()
  }

  return { role, tenantId }
}

/**
 * POST /auth/google/callback
 * Body: { credential } Google ID token
 *   or  { demoRole: 'admin'|'tenant_manager' } when demo auth enabled
 */
async function googleCallback(req, res) {
  try {
    let profile

    if (req.body.credential) {
      profile = await verifyGoogleIdToken(req.body.credential)
    } else if (env.ALLOW_DEMO_AUTH && req.body.demoRole) {
      const demoRole = req.body.demoRole === 'admin' ? 'admin' : 'tenant_manager'
      profile = {
        googleId: `demo-${demoRole}`,
        email:
          demoRole === 'admin'
            ? 'admin@example.com'
            : 'tenant1@example.com',
        name: demoRole === 'admin' ? 'Demo Admin' : 'Demo Tenant Manager',
        picture: '',
      }
      // Force role for demo buttons
      req.body.forceRole = demoRole
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Google credential or demoRole is required',
      })
    }

    const { role, tenantId } = await resolveRoleAndTenant(
      profile.email,
      req.body.forceRole || req.body.demoRole || req.body.role,
    )

    let user = await User.findOne({
      $or: [{ email: profile.email }, { googleId: profile.googleId }],
    })

    if (user) {
      user.name = profile.name || user.name
      user.picture = profile.picture || user.picture
      user.googleId = profile.googleId || user.googleId
      user.email = profile.email
      await user.save()
    } else {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        picture: profile.picture || '',
        googleId: profile.googleId,
        role,
        tenantId: role === 'admin' ? null : tenantId,
      })
    }

    const token = signToken(user)
    return res.json({
      status: 'ok',
      token,
      user: user.toSafeJSON(),
    })
  } catch (err) {
    console.error('[auth] google callback error:', err)
    return res.status(err.status || 500).json({
      status: 'error',
      message: err.message || 'Google authentication failed',
    })
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
    }
    return res.status(200).json({ status: 'ok', user: user.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to load profile' })
  }
}

/** Stateless JWT logout — client clears token; endpoint for API completeness */
function logout(_req, res) {
  return res.json({ status: 'ok', message: 'Logged out' })
}

module.exports = {
  googleConfig,
  googleCallback,
  me,
  logout,
}
