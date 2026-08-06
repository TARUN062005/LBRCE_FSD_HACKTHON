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
    // Denormalized labels for board cards (avoid extra joins on every tick)
    driverName: { type: String, default: '' },
    chargerLabel: { type: String, default: '' },
    priorityTier: { type: String, default: 'medium' },
  },
  { timestamps: true },
)

sessionSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    chargerId: this.chargerId?.toString?.() || String(this.chargerId),
    vehicleId: this.vehicleId?.toString?.() || String(this.vehicleId),
    tenantId: this.tenantId?.toString?.() || String(this.tenantId),
    siteId: this.siteId?.toString?.() || String(this.siteId),
    state: this.state,
    allocatedPowerKw: this.allocatedPowerKw,
    startTime: this.startTime?.toISOString?.() || this.startTime,
    endTime: this.endTime ? this.endTime.toISOString() : null,
    kWhDelivered: Number(this.kWhDelivered.toFixed?.(3) ?? this.kWhDelivered),
    driverName: this.driverName,
    chargerLabel: this.chargerLabel,
    priorityTier: this.priorityTier,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Session', sessionSchema)
module.exports.SESSION_STATES = SESSION_STATES
module.exports.ACTIVE_STATES = ACTIVE_STATES
