const Site = require('../models/Site')
const Charger = require('../models/Charger')
const Tenant = require('../models/Tenant')
const Session = require('../models/Session')
const Invoice = require('../models/Invoice')
const Vehicle = require('../models/Vehicle')
const { ACTIVE_STATES } = require('../models/Session')
const { getSiteHistory } = require('../services/metrics.service')
const { getTariff } = require('../services/tariff.service')
const { currentPeriod } = require('../services/billing.service')

async function getDashboard(req, res) {
  try {
    const period = currentPeriod()
    const tariff = getTariff(new Date())

    if (req.user.role === 'admin') {
      const [sites, chargers, tenants, activeSessions, invoices, vehicles, energyAgg] =
        await Promise.all([
          Site.find().sort({ name: 1 }),
          Charger.find(),
          Tenant.find(),
          Session.find({ state: { $in: ACTIVE_STATES } }),
          Invoice.find({ period }),
          Vehicle.countDocuments(),
          Session.aggregate([
            { $group: { _id: null, totalKwh: { $sum: '$kWhDelivered' } } },
          ]),
        ])

      const usedBySite = {}
      for (const s of activeSessions) {
        const key = s.siteId.toString()
        usedBySite[key] = (usedBySite[key] || 0) + (s.allocatedPowerKw || 0)
      }

      const siteSummaries = sites.map((site) => {
        const id = site._id.toString()
        return {
          id,
          name: site.name,
          maxCapacityKw: site.maxCapacityKw,
          usedKw: Math.round((usedBySite[id] || 0) * 10) / 10,
          chargerCount: chargers.filter((c) => c.siteId.toString() === id).length,
        }
      })

      const totalCapacity = siteSummaries.reduce((s, x) => s + x.maxCapacityKw, 0)
      const totalUsed = siteSummaries.reduce((s, x) => s + x.usedKw, 0)
      const gridUtilizationPct =
        totalCapacity > 0
          ? Math.round((totalUsed / totalCapacity) * 1000) / 10
          : 0
      const totalEnergyKwh = Number((energyAgg[0]?.totalKwh || 0).toFixed(3))

      const tenantNameById = Object.fromEntries(
        tenants.map((t) => [t._id.toString(), t.companyName]),
      )

      const tenantCosts = invoices.map((inv) => ({
        tenantId: inv.tenantId.toString(),
        companyName: inv.companyName || tenantNameById[inv.tenantId.toString()] || 'Tenant',
        totalKwh: Number((inv.totalKwh || 0).toFixed(3)),
        amount: Number((inv.amount || 0).toFixed(4)),
        sessionCount: inv.sessionIds.length,
      }))

      // Prefer primary site history; fall back to merged
      const primarySiteId = siteSummaries[0]?.id
      const powerUsage = getSiteHistory(primarySiteId).map((p) => ({
        time: p.at,
        usedKw: p.usedKw,
        capacityKw: p.maxCapacityKw,
      }))

      // Seed a baseline point so the chart isn't empty before first sim tick
      if (!powerUsage.length && primarySiteId) {
        powerUsage.push({
          time: new Date().toISOString(),
          usedKw: siteSummaries[0].usedKw,
          capacityKw: siteSummaries[0].maxCapacityKw,
        })
      }

      return res.json({
        status: 'ok',
        data: {
          role: 'admin',
          period,
          tariff,
          summary: {
            sites: sites.length,
            chargers: chargers.length,
            tenants: tenants.length,
            vehicles,
            activeSessions: activeSessions.length,
            totalCapacityKw: totalCapacity,
            usedKw: Math.round(totalUsed * 10) / 10,
            gridUtilizationPct,
            totalEnergyKwh,
            tariffRate: tariff.pricePerKwh,
            tariffLabel: tariff.label,
            billedAmount: tenantCosts.reduce((s, t) => s + t.amount, 0),
          },
          sites: siteSummaries,
          powerUsage,
          tenantCosts,
        },
      })
    }

    if (req.user.role === 'tenant_manager') {
      if (!req.user.tenantId) {
        return res.status(403).json({ status: 'error', message: 'No tenant linked' })
      }

      const tenant = await Tenant.findById(req.user.tenantId)
      const [vehicles, sessions, invoice, site] = await Promise.all([
        Vehicle.find({ tenantId: req.user.tenantId }),
        Session.find({ tenantId: req.user.tenantId }).sort({ startTime: -1 }).limit(20),
        Invoice.findOne({ tenantId: req.user.tenantId, period, status: 'open' }),
        tenant ? Site.findById(tenant.siteId) : null,
      ])

      const active = sessions.filter((s) => ACTIVE_STATES.includes(s.state))
      const usedKw = active.reduce((s, x) => s + (x.allocatedPowerKw || 0), 0)

      const powerUsage = site
        ? getSiteHistory(site._id.toString()).map((p) => ({
            time: p.at,
            usedKw: p.usedKw,
            capacityKw: p.maxCapacityKw,
          }))
        : []

      if (!powerUsage.length && site) {
        powerUsage.push({
          time: new Date().toISOString(),
          usedKw: Math.round(usedKw * 10) / 10,
          capacityKw: site.maxCapacityKw,
        })
      }

      return res.json({
        status: 'ok',
        data: {
          role: 'tenant_manager',
          period,
          tariff,
          summary: {
            vehicles: vehicles.length,
            activeSessions: active.length,
            totalKwh: invoice?.totalKwh || 0,
            amount: invoice?.amount || 0,
            usedKw: Math.round(usedKw * 10) / 10,
            capacityKw: site?.maxCapacityKw || 0,
          },
          powerUsage,
          tenantCosts: invoice
            ? [
                {
                  tenantId: req.user.tenantId,
                  companyName: tenant?.companyName || 'Your fleet',
                  totalKwh: Number((invoice.totalKwh || 0).toFixed(3)),
                  amount: Number((invoice.amount || 0).toFixed(4)),
                  sessionCount: invoice.sessionIds.length,
                },
              ]
            : [],
          recentSessions: sessions.slice(0, 5).map((s) => s.toSafeJSON()),
        },
      })
    }

    return res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
  } catch (err) {
    console.error('[dashboard] error:', err)
    return res.status(500).json({ status: 'error', message: 'Failed to load dashboard' })
  }
}

module.exports = { getDashboard }
