/**
 * Unit tests for allocatePower — run with: npm test --prefix backend
 */
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { allocatePower, minThresholdKw } = require('./optimizer.service')

const now = new Date('2026-08-06T12:00:00')

function session(partial) {
  return {
    id: 'x',
    maxPowerKw: 22,
    priorityTier: 'medium',
    departureTime: new Date(now.getTime() + 4 * 3600_000),
    batteryCapacityKwh: 60,
    kWhDelivered: 0,
    ...partial,
  }
}

describe('allocatePower', () => {
  it('gives full charger power when capacity is ample', () => {
    const result = allocatePower(
      [session({ id: 'a', maxPowerKw: 22 })],
      100,
      { band: 'normal' },
      { now },
    )
    assert.equal(result.length, 1)
    assert.equal(result[0].allocatedPowerKw, 22)
    assert.equal(result[0].state, 'optimized')
  })

  it('prefers SLA / sooner departure over low priority', () => {
    const result = allocatePower(
      [
        session({
          id: 'low',
          priorityTier: 'low',
          departureTime: new Date(now.getTime() + 8 * 3600_000),
          maxPowerKw: 22,
        }),
        session({
          id: 'sla',
          priorityTier: 'sla',
          departureTime: new Date(now.getTime() + 1 * 3600_000),
          maxPowerKw: 22,
        }),
      ],
      22,
      { band: 'peak' },
      { now },
    )

    const byId = Object.fromEntries(result.map((r) => [r.id, r]))
    assert.equal(byId.sla.allocatedPowerKw, 22)
    assert.equal(byId.low.allocatedPowerKw, 0)
    assert.equal(byId.low.state, 'throttled')
    assert.ok(byId.sla.score > byId.low.score)
  })

  it('marks under-threshold grants as throttled', () => {
    const result = allocatePower(
      [
        session({ id: 'a', maxPowerKw: 50, priorityTier: 'high' }),
        session({ id: 'b', maxPowerKw: 50, priorityTier: 'low' }),
      ],
      10,
      { band: 'normal' },
      { now },
    )

    const total = result.reduce((s, r) => s + r.allocatedPowerKw, 0)
    assert.ok(total <= 10 + 1e-9)
    assert.ok(result.some((r) => r.state === 'throttled'))
    for (const r of result) {
      if (r.allocatedPowerKw < minThresholdKw(r.requestedKw)) {
        assert.equal(r.state, 'throttled')
      }
    }
  })

  it('is a pure function of inputs (same args → same result)', () => {
    const args = [
      [session({ id: 'a' }), session({ id: 'b', priorityTier: 'sla' })],
      30,
      { band: 'off-peak' },
      { now },
    ]
    const a = allocatePower(...args)
    const b = allocatePower(...args)
    assert.deepEqual(a, b)
  })
})
