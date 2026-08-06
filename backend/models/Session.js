const mongoose = require('mongoose')

/** Exact state machine for the live board / simulator. */
const SESSION_STATES = [
  'queued',
  'connected',
  'charging',
  'optimized',
  'throttled',
  'completed',
]

const ACTIVE_STATES = SESSION_STATES.filter((s) => s !== 'completed')

const powerHistorySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    kw: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
)

const sessionSchema = new mongoose.Schema(
  {
    chargerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
      required: true,
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    state: {
      type: String,
      enum: SESSION_STATES,
      default: 'queued',
      index: true,
    },
    allocatedPowerKw: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Alias field for API docs */
    allocatedPower: {
      type: Number,
      default: 0,
      min: 0,
    },
    powerHistory: {
      type: [powerHistorySchema],
      default: [],
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    kWhDelivered: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Denormalized labels for board cards
    driverName: { type: String, default: '' },
    chargerLabel: { type: String, default: '' },
    priorityTier: { type: String, default: 'medium' },
    vehicleType: { type: String, default: 'car' },
    currentCharge: { type: Number, default: 20 },
    targetCharge: { type: Number, default: 80 },
    batteryCapacityKwh: { type: Number, default: 60 },
    maxChargingPowerKw: { type: Number, default: 22 },
    chargerMaxPowerKw: { type: Number, default: 22 },
    /** Voltage actually served for this vehicle (not ultra-rail max). */
    servingVoltage: { type: Number, default: 400 },
    chargerVoltage: { type: Number, default: 400 },
    departureTime: { type: Date, default: null },
    /** FIFO key — when the driver paid / arrived in the queue */
    arrivalTime: { type: Date, default: null },
    urgencyScore: { type: Number, default: 0 },
    allocationReason: { type: String, default: '' },
    estimatedCompletionAt: { type: Date, default: null },
  },
  { timestamps: true },
)

sessionSchema.pre('save', function syncAllocatedAlias() {
  if (this.isModified('allocatedPowerKw')) {
    this.allocatedPower = this.allocatedPowerKw
  } else if (this.isModified('allocatedPower')) {
    this.allocatedPowerKw = this.allocatedPower
  }
})

sessionSchema.methods.toSafeJSON = function toSafeJSON() {
  const now = Date.now()
  const depart = this.departureTime ? new Date(this.departureTime).getTime() : null
  const minutesLeft =
    depart != null ? Math.max(0, Math.round((depart - now) / 60000)) : null
  return {
    id: this._id.toString(),
    sessionId: this._id.toString(),
    chargerId: this.chargerId?.toString?.() || String(this.chargerId),
    vehicleId: this.vehicleId?.toString?.() || String(this.vehicleId),
    tenantId: this.tenantId?.toString?.() || String(this.tenantId),
    siteId: this.siteId?.toString?.() || String(this.siteId),
    bookingId: this.bookingId ? this.bookingId.toString() : null,
    userId: this.userId ? this.userId.toString() : null,
    state: this.state,
    allocatedPowerKw: this.allocatedPowerKw,
    allocatedPower: this.allocatedPowerKw,
    powerHistory: (this.powerHistory || []).slice(-40).map((p) => ({
      at: p.at?.toISOString?.() || p.at,
      kw: p.kw,
    })),
    startTime: this.startTime?.toISOString?.() || this.startTime,
    endTime: this.endTime ? this.endTime.toISOString() : null,
    kWhDelivered: Number(Number(this.kWhDelivered || 0).toFixed(3)),
    driverName: this.driverName,
    chargerLabel: this.chargerLabel,
    priority: this.priorityTier,
    priorityTier: this.priorityTier,
    vehicleType: this.vehicleType || 'car',
    currentCharge: this.currentCharge ?? 20,
    targetCharge: this.targetCharge ?? 80,
    batteryCapacityKwh: this.batteryCapacityKwh,
    maxChargingPowerKw: this.maxChargingPowerKw,
    chargerMaxPowerKw: this.chargerMaxPowerKw,
    requestedKw: Math.min(
      Number(this.maxChargingPowerKw) || 0,
      Number(this.chargerMaxPowerKw) || Number(this.maxChargingPowerKw) || 0,
    ),
    voltage: this.servingVoltage || 400,
    servingVoltage: this.servingVoltage || 400,
    chargerVoltage: this.chargerVoltage || 400,
    departureTime: this.departureTime?.toISOString?.() || this.departureTime,
    arrivalTime: this.arrivalTime?.toISOString?.() || this.arrivalTime || this.createdAt,
    urgencyScore: this.urgencyScore || 0,
    minutesLeft,
    timeRemaining: minutesLeft != null ? `${minutesLeft} min` : '—',
    estimatedChargeMinutes: (() => {
      const battery = Math.max(1, Number(this.batteryCapacityKwh) || 60)
      const need = Math.max(
        0,
        ((Number(this.targetCharge ?? 80) - Number(this.currentCharge ?? 20)) / 100) * battery,
      )
      const kw = Number(this.allocatedPowerKw) || 0
      if (kw <= 0 || need <= 0) return null
      return Math.max(1, Math.ceil((need / kw) * 60))
    })(),
    allocationReason: this.allocationReason || '',
    reason: this.allocationReason || '',
    estimatedCompletionAt: this.estimatedCompletionAt?.toISOString?.() || this.estimatedCompletionAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Session', sessionSchema)
module.exports.SESSION_STATES = SESSION_STATES
module.exports.ACTIVE_STATES = ACTIVE_STATES
