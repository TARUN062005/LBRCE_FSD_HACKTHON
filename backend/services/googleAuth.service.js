const { OAuth2Client } = require('google-auth-library')
const env = require('../config/env')

let client = null

function getClient() {
  if (!env.GOOGLE_CLIENT_ID) return null
  if (!client) {
    client = new OAuth2Client(env.GOOGLE_CLIENT_ID)
  }
  return client
}

/**
 * Verify Google ID token (GIS credential).
 * @returns {{ googleId, email, name, picture }}
 */
async function verifyGoogleIdToken(credential) {
  const oauth = getClient()
  if (!oauth) {
    throw Object.assign(new Error('Google OAuth is not configured'), { status: 503 })
  }

  const ticket = await oauth.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  if (!payload?.email) {
    throw Object.assign(new Error('Invalid Google token'), { status: 401 })
  }

  return {
    googleId: payload.sub,
    email: String(payload.email).toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture || '',
  }
}

module.exports = { verifyGoogleIdToken, getClient }
