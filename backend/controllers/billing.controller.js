const Invoice = require('../models/Invoice')
const Tenant = require('../models/Tenant')
const { currentPeriod } = require('../services/billing.service')
const { buildInvoicePdf } = require('../services/pdf.service')
const { managedTenantIds, ownsTenant } = require('../middleware/auth.middleware')

async function listBilling(req, res) {
  try {
    const filter = {}

    if (req.user.role === 'tenant_manager') {
      const ids = managedTenantIds(req)
      if (!ids.length) {
        return res.status(403).json({ status: 'error', message: 'No tenant linked' })
      }
      filter.tenantId = { $in: ids }
    } else if (req.user.role === 'admin') {
      filter.userId = null
      if (req.query.tenantId) filter.tenantId = req.query.tenantId
    } else if (req.user.role === 'normal_user') {
      filter.userId = req.user.userId
    } else {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
    }

    const invoices = await Invoice.find(filter).sort({ period: -1, createdAt: -1 })

    if (req.user.role === 'admin') {
      const tenantIds = [
        ...new Set(invoices.filter((i) => i.tenantId).map((i) => i.tenantId.toString())),
      ]
      const tenants = await Tenant.find({ _id: { $in: tenantIds } })
      const nameById = Object.fromEntries(
        tenants.map((t) => [t._id.toString(), t.companyName]),
      )
      for (const inv of invoices) {
        if (inv.tenantId && !inv.companyName) {
          inv.companyName = nameById[inv.tenantId.toString()] || ''
        }
      }
    }

    const period = currentPeriod()
    const periodInvoices = invoices.filter((i) => i.period === period)

    let summary
    if (req.user.role === 'tenant_manager' || req.user.role === 'normal_user') {
      const open = periodInvoices.find((i) => i.status === 'open') || periodInvoices[0]
      summary = {
        period,
        totalKwh: open ? open.totalKwh : 0,
        amount: open ? open.amount : 0,
        sessionCount: open
          ? (open.sessionIds?.length || 0) + (open.bookingIds?.length || 0)
          : 0,
        invoiceId: open ? open._id.toString() : null,
      }
    } else {
      summary = {
        period,
        totalKwh: periodInvoices.reduce((s, i) => s + (i.totalKwh || 0), 0),
        amount: periodInvoices.reduce((s, i) => s + (i.amount || 0), 0),
        sessionCount: periodInvoices.reduce(
          (s, i) => s + (i.sessionIds?.length || 0) + (i.bookingIds?.length || 0),
          0,
        ),
        invoiceId: null,
      }
    }

    let byTenant = null
    if (req.user.role === 'admin') {
      byTenant = periodInvoices
        .filter((i) => i.tenantId)
        .map((i) => ({
          tenantId: i.tenantId.toString(),
          companyName: i.companyName || 'Tenant',
          period: i.period,
          totalKwh: Number((i.totalKwh || 0).toFixed(3)),
          amount: Number((i.amount || 0).toFixed(2)),
          sessionCount: (i.sessionIds || []).length + (i.bookingIds || []).length,
          invoiceId: i._id.toString(),
        }))
    }

    return res.json({
      status: 'ok',
      data: {
        summary,
        invoices: invoices.map((i) => i.toSafeJSON()),
        byTenant,
      },
    })
  } catch (err) {
    console.error('[billing] list error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to load billing' })
  }
}

function assertInvoiceAccess(req, invoice) {
  if (req.user.role === 'tenant_manager') {
    if (!ownsTenant(req, invoice.tenantId)) {
      return { status: 404, message: 'Invoice not found' }
    }
  }
  if (req.user.role === 'normal_user') {
    if (!invoice.userId || invoice.userId.toString() !== req.user.userId) {
      return { status: 404, message: 'Invoice not found' }
    }
  }
  if (req.user.role === 'admin' && invoice.userId) {
    return { status: 403, message: 'Admins cannot access driver invoices' }
  }
  if (!['admin', 'tenant_manager', 'normal_user'].includes(req.user.role)) {
    return { status: 403, message: 'Insufficient permissions' }
  }
  return null
}

async function getInvoice(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId)
    if (!invoice) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found' })
    }
    const denied = assertInvoiceAccess(req, invoice)
    if (denied) {
      return res.status(denied.status).json({ status: 'error', message: denied.message })
    }
    return res.json({ status: 'ok', data: invoice.toSafeJSON() })
  } catch (err) {
    return res.status(400).json({ status: 'error', message: 'Invalid invoice id' })
  }
}

async function downloadPdf(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId)
    if (!invoice) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found' })
    }
    const denied = assertInvoiceAccess(req, invoice)
    if (denied) {
      return res.status(denied.status).json({ status: 'error', message: denied.message })
    }

    const pdf = buildInvoicePdf(invoice.toSafeJSON())
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice._id}.pdf"`,
    )
    return res.send(pdf)
  } catch (err) {
    console.error('[billing] pdf error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to generate PDF' })
  }
}

module.exports = { listBilling, getInvoice, downloadPdf }
