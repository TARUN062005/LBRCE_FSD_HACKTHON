/**
 * In-memory JWT + localStorage mirror.
 * Axios reads from memory first; AuthContext keeps both in sync.
 */

const TOKEN_KEY = 'token'
const USER_KEY = 'auth_user'

let memoryToken = null
let memoryUser = null

export function getAuthToken() {
  if (memoryToken) return memoryToken
  memoryToken = localStorage.getItem(TOKEN_KEY)
  return memoryToken
}

export function getAuthUser() {
  if (memoryUser) return memoryUser
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    memoryUser = JSON.parse(raw)
    return memoryUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function setAuthSession(token, user) {
  memoryToken = token || null
  memoryUser = user || null

  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_KEY)
  }
}

export function clearAuthSession() {
  setAuthSession(null, null)
}

export function hydrateAuthSession() {
  return {
    token: getAuthToken(),
    user: getAuthUser(),
  }
}

export function homePathForRole(role) {
  if (role === 'admin') return '/admin'
  if (role === 'tenant_manager') return '/tenant'
  if (role === 'normal_user') return '/user'
  return '/login'
}
