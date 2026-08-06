const Tenant = require('../models/Tenant')
const Site = require('../models/Site')
const { BILLING_PLANS } = require('../models/Tenant')

async function listTenants(_req, res) {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 })
    return res.json({ status: 'ok', data: tenants.map((t) => t.toSafeJSON()) })
  } catch (err) {
    console.error('[tenants] list error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to list tenants' })
  }
}

async function getTenant(req, res) {
  try {
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) {
      return res.status(404).json({ status: 'error', message: 'Tenant not found' })
    }
    return res.json({ status: 'ok', data: tenant.toSafeJSON() })
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid tenant id' })
  }
}

async function createTenant(req, res) {
  try {
    const companyName = String(req.body.companyName || '').trim()
    const billingPlan = req.body.billingPlan || 'standard'
    const siteId = req.body.siteId

    if (!companyName || !siteId) {
      return res.status(400).json({
        status: 'error',
        message: 'companyName and siteId are required',
      })
    }
    if (!BILLING_PLANS.includes(billingPlan)) {
      return res.status(400).json({ status: 'error', message: 'Invalid billingPlan' })
    }

    const site = await Site.findById(siteId)
    if (!site) {
      return res.status(400).json({ status: 'error', message: 'Site not found' })
    }

    const tenant = await Tenant.create({ companyName, billingPlan, siteId })
    return res.status(201).json({ status: 'ok', data: tenant.toSafeJSON() })
  } catch (err) {
    console.error('[tenants] create error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to create tenant' })
  }
}

async function updateTenant(req, res) {
  try {
    const tenant = await Tenant.findById(req.params.id)
    if (!tenant) {
      return res.status(404).json({ status: 'error', message: 'Tenant not found' })
    }

    if (req.body.companyName !== undefined) {
      tenant.companyName = String(req.body.companyName).trim()
    }
    if (req.body.billingPlan !== undefined) {
      if (!BILLING_PLANS.includes(req.body.billingPlan)) {
        return res.status(400).json({ status: 'error', message: 'Invalid billingPlan' })
      }
      tenant.billingPlan = req.body.billingPlan
    }
    if (req.body.siteId !== undefined) {
      const site = await Site.findById(req.body.siteId)
      if (!site) {
        return res.status(400).json({ status: 'error', message: 'Site not found' })
      }
      tenant.siteId = req.body.siteId
    }

    await tenant.save()
    return res.json({ status: 'ok', data: tenant.toSafeJSON() })
  } catch (err) {
    console.error('[tenants] update error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to update tenant' })
  }
}

async function deleteTenant(req, res) {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id)
    if (!tenant) {
      return res.status(404).json({ status: 'error', message: 'Tenant not found' })
    }
    return res.json({ status: 'ok', message: 'Tenant deleted' })
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid tenant id' })
  }
}

module.exports = {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
}
