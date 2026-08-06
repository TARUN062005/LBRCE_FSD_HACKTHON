/**
 * Ensures the caller is a tenant_manager with a JWT-bound tenantId.
 * Isolation boundary: never accept tenantId from the client.
 */
function requireTenantContext(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' })
  }
  if (req.user.role !== 'tenant_manager') {
    return res.status(403).json({ status: 'error', message: 'Tenant manager access required' })
  }
  if (!req.user.tenantId) {
    return res.status(403).json({
      status: 'error',
      message: 'Account is not linked to a tenant',
    })
  }
  // Canonical scoped id — controllers must use this only
  req.tenantId = req.user.tenantId
  return next()
}

module.exports = { requireTenantContext }
