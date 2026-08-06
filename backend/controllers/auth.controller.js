const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const env = require('../config/env')
const User = require('../models/User')

const SALT_ROUNDS = 10
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '7d'

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
    },
    env.JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  )
}

async function login(req, res) {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase()
    const password = String(req.body.password || '')

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password are required' })
    }

    const user = await User.findOne({ email }).select('+passwordHash')
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' })
    }

    const token = signToken(user)

    return res.status(200).json({
      status: 'ok',
      token,
      user: user.toSafeJSON(),
    })
  } catch (err) {
    console.error('[auth] login error:', err)
    return res.status(500).json({ status: 'error', message: 'Login failed' })
  }
}

/**
 * Admin-only registration for seeding tenants/users.
 * Body: { name, email, password, role, tenantId? }
 */
async function register(req, res) {
  try {
    const name = String(req.body.name || '').trim()
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase()
    const password = String(req.body.password || '')
    const role = String(req.body.role || '').trim()
    let tenantId = req.body.tenantId || null

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'name, email, password, and role are required',
      })
    }

    if (!['admin', 'tenant_manager'].includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Invalid role' })
    }

    if (role === 'tenant_manager') {
      if (!tenantId) {
        tenantId = new mongoose.Types.ObjectId()
      } else if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid tenantId' })
      }
    } else {
      tenantId = null
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters',
      })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      tenantId,
    })

    return res.status(201).json({
      status: 'ok',
      user: user.toSafeJSON(),
    })
  } catch (err) {
    console.error('[auth] register error:', err)
    return res.status(500).json({ status: 'error', message: 'Registration failed' })
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

module.exports = { login, register, me }
