const jwt = require('jsonwebtoken')
const env = require('../config/env')
const User = require('../models/User')
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

/**
 * Resolve role from Google identity.
 * - SUPER_ADMIN_EMAIL → admin (every login; env changes update role)
 * - Existing tenant_manager → keep (admin-promoted)
 * - Everyone else → normal_user
 * Never auto-assigns tenant_manager.
 */
function resolveGoogleRole(email, existing) {
  const isSuper = env.SUPER_ADMIN_EMAIL && email === env.SUPER_ADMIN_EMAIL

  if (isSuper) {
    return { role: 'admin', tenantId: null }
  }

  if (existing?.role === 'tenant_manager' && existing.tenantId) {
    return { role: 'tenant_manager', tenantId: existing.tenantId }
  }

  // Former super-admin whose email no longer matches env → demote
  return { role: 'normal_user', tenantId: null }
}

function googleConfig(_req, res) {
  return res.json({
    status: 'ok',
    data: {
      clientId: env.GOOGLE_CLIENT_ID || null,
      configured: Boolean(env.GOOGLE_CLIENT_ID),
      superAdminConfigured: Boolean(env.SUPER_ADMIN_EMAIL),
    },
  })
}

/**
 * POST /auth/google/callback
 * Body: { credential } Google ID token only.
 */
async function googleCallback(req, res) {
  try {
    if (!req.body.credential) {
      return res.status(400).json({
        status: 'error',
        message: 'Google credential is required',
      })
    }

    if (!env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        status: 'error',
        message: 'Google OAuth is not configured (GOOGLE_CLIENT_ID)',
      })
    }

    const profile = await verifyGoogleIdToken(req.body.credential)
    const email = profile.email

    let user = await User.findOne({
      $or: [{ email }, { googleId: profile.googleId }],
    })

    const { role, tenantId } = resolveGoogleRole(email, user)

    if (user) {
      user.name = profile.name || user.name
      user.picture = profile.picture || user.picture
      user.googleId = profile.googleId || user.googleId
      user.email = email
      user.role = role
      user.tenantId = tenantId
      await user.save()
    } else {
      user = await User.create({
        name: profile.name,
        email,
        picture: profile.picture || '',
        googleId: profile.googleId,
        role,
        tenantId,
      })
    }

    // Role always reloaded from DB after save
    const fresh = await User.findById(user._id)
    const token = signToken(fresh)
    return res.json({
      status: 'ok',
      token,
      user: fresh.toSafeJSON(),
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

function logout(_req, res) {
  return res.json({ status: 'ok', message: 'Logged out' })
}

module.exports = {
  googleConfig,
  googleCallback,
  me,
  logout,
}
