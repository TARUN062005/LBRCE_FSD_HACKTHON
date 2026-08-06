/**
 * Grid optimizer unit tests — capacity never exceeded.
 * Scenario: 20 vehicles, 10 chargers, 3 tenants, 100 kW site.
 */
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  allocatePower,
  calculateUrgency,
  calculateTenantQuota,
  PRIORITY_WEIGHT,
  MAX_TENANT_SHARE,
} = require('./optimizer.service')

function makeSession(overrides = {}) {
  const now = overrides.now || new Date('2026-08-06T12:00:00Z')
  return {
    id: overrides.id || 's1',
    tenantId: overrides.tenantId || 't1',
    vehicleType: overrides.vehicleType || 'car',
    batteryCapacityKwh: overrides.batteryCapacityKwh ?? 60,
    currentCharge: overrides.currentCharge ?? 20,
    targetCharge: overrides.targetCharge ?? 90,
    maxChargingPowerKw: overrides.maxChargingPowerKw ?? 22,
    chargerMaxPowerKw: overrides.chargerMaxPowerKw ?? 22,
    priorityTier: overrides.priorityTier || 'medium',
    departureTime:
      overrides.departureTime ||
      new Date(now.getTime() + (overrides.hoursLeft ?? 3) * 3600_000),
    kWhDelivered: overrides.kWhDelivered ?? 0,
  }
}

describe('calculateUrgency', () => {
  it('raises score when departure is soon and energy need is high', () => {
    const now = new Date('2026-08-06T12:00:00Z')
    const soon = calculateUrgency(
      makeSession({
        hoursLeft: 0.5,
        currentCharge: 10,
        targetCharge: 90,
        priorityTier: 'emergency',
        now,
      }),
      now,
    )
    const later = calculateUrgency(
      makeSession({
        hoursLeft: 8,
        currentCharge: 10,
        targetCharge: 90,
        priorityTier: 'low',
        now,
      }),
      now,
    )
    assert.ok(soon.urgencyScore > later.urgencyScore)
    assert.equal(soon.priorityWeight, PRIORITY_WEIGHT.emergency)
  })
})

describe('calculateTenantQuota', () => {
  it('caps a dominant tenant when multiple tenants share the site', () => {
    const sessions = [
      ...Array.from({ length: 6 }, (_, i) => makeSession({ id: `a${i}`, tenantId: 'A' })),
      ...Array.from({ length: 2 }, (_, i) => makeSession({ id: `b${i}`, tenantId: 'B' })),
    ]
    const quotas = calculateTenantQuota(sessions, 100)
    assert.ok(quotas.get('A') <= 100 * MAX_TENANT_SHARE + 0.05)
    assert.ok(quotas.get('B') > 0)
    assert.ok(quotas.get('A') + quotas.get('B') <= 100 + 0.2)
  })
})

describe('allocatePower', () => {
  it('never exceeds site capacity', () => {
    const now = new Date('2026-08-06T12:00:00Z')
    const sessions = [
      makeSession({ id: 'truck', vehicleType: 'truck', maxChargingPowerKw: 80, chargerMaxPowerKw: 150, priorityTier: 'high', hoursLeft: 1, now }),
      makeSession({ id: 'car1', vehicleType: 'car', maxChargingPowerKw: 40, chargerMaxPowerKw: 50, hoursLeft: 2, now }),
      makeSession({ id: 'car2', vehicleType: 'car', maxChargingPowerKw: 35, chargerMaxPowerKw: 50, hoursLeft: 2.5, now }),
      makeSession({ id: 'bike', vehicleType: 'bike', maxChargingPowerKw: 5, chargerMaxPowerKw: 3, batteryCapacityKwh: 4, hoursLeft: 4, now }),
    ]
    const alloc = allocatePower(sessions, 100, { band: 'normal' }, { now })
    const total = alloc.reduce((s, a) => s + a.allocatedPowerKw, 0)
    assert.ok(total <= 100 + 0.05, `total ${total} exceeds 100`)
    for (const a of alloc) {
      const src = sessions.find((s) => s.id === a.id)
      const max = Math.min(src.maxChargingPowerKw, src.chargerMaxPowerKw)
      assert.ok(a.allocatedPowerKw <= max + 0.05)
    }
  })

  it('respects charger and vehicle max power', () => {
    const now = new Date('2026-08-06T12:00:00Z')
    const sessions = [
      makeSession({
        id: 'c1',
        maxChargingPowerKw: 22,
        chargerMaxPowerKw: 11,
        now,
      }),
    ]
    const [a] = allocatePower(sessions, 100, { band: 'normal' }, { now })
    assert.ok(a.allocatedPowerKw <= 11)
  })

  it('20 vehicles / 10 chargers / 3 tenants / 100 kW never over-cap', () => {
    const now = new Date('2026-08-06T12:00:00Z')
    const types = ['bike', 'car', 'car', 'bus', 'truck']
    const chargerPowers = [3, 22, 22, 22, 50, 50, 80, 80, 150, 22]
    const sessions = []

    for (let i = 0; i < 20; i++) {
      const type = types[i % types.length]
      const chargerMax = chargerPowers[i % chargerPowers.length]
      const vehicleMax =
        type === 'bike' ? 3 : type === 'car' ? 22 : type === 'bus' ? 80 : 120
      sessions.push(
        makeSession({
          id: `v${i}`,
          tenantId: `t${(i % 3) + 1}`,
          vehicleType: type,
          maxChargingPowerKw: vehicleMax,
          chargerMaxPowerKw: chargerMax,
          batteryCapacityKwh: type === 'bike' ? 4 : type === 'car' ? 60 : type === 'bus' ? 300 : 500,
          currentCharge: 15 + (i % 40),
          targetCharge: 85,
          priorityTier: ['background', 'low', 'medium', 'high', 'emergency'][i % 5],
          hoursLeft: 0.5 + (i % 6),
          now,
        }),
      )
    }

    assert.equal(sessions.length, 20)
    const tenants = new Set(sessions.map((s) => s.tenantId))
    assert.equal(tenants.size, 3)

    const alloc = allocatePower(sessions, 100, { band: 'peak' }, { now })
    assert.equal(alloc.length, 20)

    const total = alloc.reduce((s, a) => s + a.allocatedPowerKw, 0)
    assert.ok(total <= 100 + 0.05, `capacity violated: ${total}`)

    for (const a of alloc) {
      const src = sessions.find((s) => s.id === a.id)
      const max = Math.min(src.maxChargingPowerKw, src.chargerMaxPowerKw)
      assert.ok(
        a.allocatedPowerKw <= max + 0.05,
        `${a.id} got ${a.allocatedPowerKw} > max ${max}`,
      )
    }

    // Tenant fairness: no tenant gets entire 100 when 3 share
    const byTenant = {}
    for (const a of alloc) {
      byTenant[a.tenantId] = (byTenant[a.tenantId] || 0) + a.allocatedPowerKw
    }
    for (const [tid, kw] of Object.entries(byTenant)) {
      assert.ok(kw <= 100 * MAX_TENANT_SHARE + 1, `tenant ${tid} took ${kw}`)
    }

    // At least some non-bike power when capacity exists
    const carLike = alloc.filter((a) => a.vehicleType !== 'bike' && a.allocatedPowerKw > 0)
    assert.ok(carLike.length >= 1, 'cars/buses should receive some power')
  })

  it('is deterministic for the same inputs', () => {
    const now = new Date('2026-08-06T12:00:00Z')
    const sessions = [
      makeSession({ id: 'a', tenantId: 't1', hoursLeft: 1, now }),
      makeSession({ id: 'b', tenantId: 't2', hoursLeft: 2, priorityTier: 'high', now }),
    ]
    const a1 = allocatePower(sessions, 50, { band: 'normal' }, { now })
    const a2 = allocatePower(sessions, 50, { band: 'normal' }, { now })
    assert.deepEqual(a1, a2)
  })

  it('caps at 100 kW with reasons and favors emergency over low in peak', () => {
    const now = new Date('2026-08-06T12:00:00Z')
    const sessions = [
      makeSession({
        id: 'A',
        priorityTier: 'emergency',
        maxChargingPowerKw: 50,
        chargerMaxPowerKw: 50,
        hoursLeft: 1,
        now,
      }),
      makeSession({
        id: 'B',
        priorityTier: 'high',
        maxChargingPowerKw: 40,
        chargerMaxPowerKw: 40,
        hoursLeft: 2,
        now,
      }),
      makeSession({
        id: 'C',
        priorityTier: 'medium',
        maxChargingPowerKw: 30,
        chargerMaxPowerKw: 30,
        hoursLeft: 3,
        now,
      }),
      makeSession({
        id: 'D',
        priorityTier: 'low',
        maxChargingPowerKw: 20,
        chargerMaxPowerKw: 20,
        hoursLeft: 4,
        now,
      }),
    ]
    const alloc = allocatePower(sessions, 100, { band: 'peak' }, { now })
    const total = alloc.reduce((s, a) => s + a.allocatedPowerKw, 0)
    assert.ok(total <= 100.05)
    const byId = Object.fromEntries(alloc.map((a) => [a.id, a]))
    assert.ok(byId.A.allocatedPowerKw >= byId.D.allocatedPowerKw)
    assert.ok(byId.A.reason || byId.A.allocationReason)
    assert.ok(byId.A.estimatedCompletionTime)
  })
})
