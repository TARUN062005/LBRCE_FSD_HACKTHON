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

/**
 * POST /auth/google/callback
 *
 * Google OAuth ALWAYS creates / keeps users as normal_user.
 * Never auto-promotes to admin or tenant_manager.
 *
 * Demo body `{ demoRole }` only signs into pre-seeded elevated accounts
 * (does not create admin/tenant from Google).
 */
async function googleCallback(req, res) {
  try {
    // Demo login: only for seeded elevated accounts (hackathon judging)
    if (env.ALLOW_DEMO_AUTH && req.body.demoRole) {
      const demoRole = req.body.demoRole === 'admin' ? 'admin' : 'tenant_manager'
      const email =
        demoRole === 'admin' ? 'admin@example.com' : 'tenant1@example.com'

      const user = await User.findOne({ email, role: demoRole })
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'Demo account missing — run npm run seed',
        })
      }

      const token = signToken(user)
      return res.json({ status: 'ok', token, user: user.toSafeJSON() })
    }

    if (!req.body.credential) {
      return res.status(400).json({
        status: 'error',
        message: 'Google credential is required',
      })
    }

    const profile = await verifyGoogleIdToken(req.body.credential)

    let user = await User.findOne({
      $or: [{ email: profile.email }, { googleId: profile.googleId }],
    })

    if (user) {
      // Never change elevated roles via Google login — only refresh profile fields
      user.name = profile.name || user.name
      user.picture = profile.picture || user.picture
      user.googleId = profile.googleId || user.googleId
      user.email = profile.email
      await user.save()
    } else {
      // Google OAuth ALWAYS creates normal_user
      user = await User.create({
        name: profile.name,
        email: profile.email,
        picture: profile.picture || '',
        googleId: profile.googleId,
        role: 'normal_user',
        tenantId: null,
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

function logout(_req, res) {
  return res.json({ status: 'ok', message: 'Logged out' })
}

/**
 * PATCH /auth/promote — admin only
 * Body: { userId, role: 'tenant_manager'|'normal_user', tenantId? }
 * Admins cannot be created via this endpoint.
 */
async function promote(req, res) {
  try {
    const { userId, role, tenantId } = req.body || {}
    if (!userId || !['tenant_manager', 'normal_user'].includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'userId and role (tenant_manager|normal_user) are required',
      })
    }
    if (role === 'tenant_manager' && !tenantId) {
      return res.status(400).json({
        status: 'error',
        message: 'tenantId is required when promoting to tenant_manager',
      })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
    }
    if (user.role === 'admin') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot change an admin via promote',
      })
    }

    user.role = role
    user.tenantId = role === 'tenant_manager' ? tenantId : null
    await user.save()

    return res.json({ status: 'ok', user: user.toSafeJSON() })
  } catch (err) {
    console.error('[auth] promote error:', err)
    return res.status(500).json({ status: 'error', message: err.message || 'Promote failed' })
  }
}

/** GET /auth/users — admin list of users for promotion UI */
async function listUsers(req, res) {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(200)
    return res.json({ status: 'ok', data: users.map((u) => u.toSafeJSON()) })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to list users' })
  }
}

module.exports = {
  googleConfig,
  googleCallback,
  me,
  logout,
  promote,
  listUsers,
}
