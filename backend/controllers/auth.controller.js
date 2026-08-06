const jwt = require('jsonwebtoken')
const env = require('../config/env')
const User = require('../models/User')
const { verifyGoogleIdToken } = require('../services/googleAuth.service')

const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '7d'
const MAX_PICTURE_CHARS = 350_000 // ~260KB base64 ceiling

function signToken(user) {
  const tenantIds = (user.tenantIds || []).map((id) => id.toString())
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture || '',
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      tenantIds,
    },
    env.JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  )
}

function resolveGoogleRole(email, existing) {
  const isSuper = env.SUPER_ADMIN_EMAIL && email === env.SUPER_ADMIN_EMAIL

  if (isSuper) {
    return { role: 'admin', tenantId: null, tenantIds: [] }
  }

  if (existing?.role === 'tenant_manager') {
    existing.syncTenantFields?.()
    const tenantIds = (existing.tenantIds || [])
      .map((id) => id.toString())
      .filter(Boolean)
    if (existing.tenantId && !tenantIds.includes(existing.tenantId.toString())) {
      tenantIds.unshift(existing.tenantId.toString())
    }
    if (tenantIds.length) {
      return {
        role: 'tenant_manager',
        tenantId: tenantIds[0],
        tenantIds,
      }
    }
  }

  return { role: 'normal_user', tenantId: null, tenantIds: [] }
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

    const { role, tenantId, tenantIds } = resolveGoogleRole(email, user)

    if (user) {
      // Keep display name if user customized it; otherwise sync from Google
      if (!user.name || user.name === user.email?.split('@')[0]) {
        user.name = profile.name || user.name
      }
      user.googlePicture = profile.picture || user.googlePicture || ''
      if (!user.customPicture) {
        user.picture = profile.picture || user.picture || ''
      }
      user.googleId = profile.googleId || user.googleId
      user.email = email
      user.role = role
      user.tenantId = tenantId
      user.tenantIds = tenantIds || []
      await user.save()
    } else {
      user = await User.create({
        name: profile.name,
        email,
        picture: profile.picture || '',
        googlePicture: profile.picture || '',
        customPicture: false,
        googleId: profile.googleId,
        role,
        tenantId,
        tenantIds: tenantIds || [],
      })
    }

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

/**
 * PATCH /auth/profile
 * Body: { name?, phone?, vehicleNumber?, picture? }
 * picture: data URL (image/*) or https URL; empty string clears custom photo.
 */
async function updateProfile(req, res) {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
    }

    const { name, phone, vehicleNumber, picture } = req.body || {}

    if (name !== undefined) {
      const trimmed = String(name).trim()
      if (trimmed.length < 2) {
        return res.status(400).json({ status: 'error', message: 'Name must be at least 2 characters' })
      }
      user.name = trimmed.slice(0, 80)
    }

    if (phone !== undefined) {
      const digits = String(phone).replace(/[^\d+]/g, '').trim()
      if (digits && digits.replace(/\D/g, '').length < 10) {
        return res.status(400).json({
          status: 'error',
          message: 'Enter a valid phone number (at least 10 digits)',
        })
      }
      user.phone = digits.slice(0, 20)
    }

    if (vehicleNumber !== undefined) {
      const plate = String(vehicleNumber)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ')
      if (plate && plate.length < 4) {
        return res.status(400).json({
          status: 'error',
          message: 'Vehicle number looks too short',
        })
      }
      user.vehicleNumber = plate.slice(0, 20)
    }

    if (picture !== undefined) {
      const pic = String(picture || '')
      if (!pic) {
        user.customPicture = false
        user.picture = user.googlePicture || ''
      } else if (pic.startsWith('data:image/')) {
        if (pic.length > MAX_PICTURE_CHARS) {
          return res.status(400).json({
            status: 'error',
            message: 'Photo is too large — try a smaller image',
          })
        }
        user.picture = pic
        user.customPicture = true
      } else if (/^https?:\/\//i.test(pic)) {
        user.picture = pic.slice(0, 2000)
        user.customPicture = true
      } else {
        return res.status(400).json({ status: 'error', message: 'Invalid photo format' })
      }
    }

    await user.save()
    return res.json({ status: 'ok', user: user.toSafeJSON() })
  } catch (err) {
    console.error('[auth] updateProfile:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to update profile' })
  }
}

/**
 * DELETE /auth/profile/photo — remove custom photo, restore Google avatar
 */
async function removePhoto(req, res) {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
    }
    user.customPicture = false
    user.picture = user.googlePicture || ''
    await user.save()
    return res.json({ status: 'ok', user: user.toSafeJSON() })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to remove photo' })
  }
}

/**
 * POST /auth/profile/reset-incomplete
 * Clears unfinished profile extras (phone, vehicle, custom photo) so user can start fresh.
 * Does NOT delete the Google account / login.
 */
async function resetIncompleteProfile(req, res) {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' })
    }
    if (user.profileComplete()) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile is already complete — edit fields individually instead',
      })
    }
    user.phone = ''
    user.vehicleNumber = ''
    user.customPicture = false
    user.picture = user.googlePicture || user.picture || ''
    await user.save()
    return res.json({
      status: 'ok',
      user: user.toSafeJSON(),
      message: 'Incomplete profile details cleared',
    })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to reset profile' })
  }
}

function logout(_req, res) {
  return res.json({ status: 'ok', message: 'Logged out' })
}

module.exports = {
  googleConfig,
  googleCallback,
  me,
  updateProfile,
  removePhoto,
  resetIncompleteProfile,
  logout,
}
