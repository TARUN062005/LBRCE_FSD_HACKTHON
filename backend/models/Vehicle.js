const mongoose = require('mongoose')

/** Stable enum values for the optimizer. */
const PRIORITY_TIERS = ['emergency', 'high', 'medium', 'low', 'background', 'sla']
const VEHICLE_TYPES = ['bike', 'car', 'bus', 'truck']

/** Default battery / max charge power by type (hackathon presets). */
const VEHICLE_PRESETS = {
  bike: { batteryCapacityKwh: 4, maxChargingPowerKw: 3 },
  car: { batteryCapacityKwh: 60, maxChargingPowerKw: 22 },
  bus: { batteryCapacityKwh: 300, maxChargingPowerKw: 80 },
  truck: { batteryCapacityKwh: 500, maxChargingPowerKw: 120 },
}

const vehicleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: VEHICLE_TYPES,
      default: 'car',
      index: true,
    },
    batteryCapacityKwh: {
      type: Number,
      required: true,
      min: 1,
    },
    /** Current SoC 0–100 */
    currentCharge: {
      type: Number,
      default: 20,
      min: 0,
      max: 100,
    },
    /** Target SoC 0–100 */
    targetCharge: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    maxChargingPowerKw: {
      type: Number,
      default: 22,
      min: 0.1,
    },
    arrivalTime: {
      type: Date,
      default: Date.now,
    },
    /** Optimizer input — keep name stable. Target departure datetime (UTC). */
    departureTime: {
      type: Date,
      required: true,
    },
    /** Optimizer input — keep name stable. */
    priorityTier: {
      type: String,
      enum: PRIORITY_TIERS,
      required: true,
      default: 'medium',
    },
  },
  { timestamps: true },
)

vehicleSchema.pre('validate', function applyTypeDefaults() {
  const type = this.vehicleType || 'car'
  const preset = VEHICLE_PRESETS[type] || VEHICLE_PRESETS.car
  if (!this.batteryCapacityKwh) this.batteryCapacityKwh = preset.batteryCapacityKwh
  if (!this.maxChargingPowerKw) this.maxChargingPowerKw = preset.maxChargingPowerKw
  if (this.currentCharge == null) this.currentCharge = 20
  if (this.targetCharge == null) this.targetCharge = 80
  // Legacy alias: sla → emergency weight
  if (this.priorityTier === 'sla') this.priorityTier = 'emergency'
})

vehicleSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    vehicleId: this._id.toString(),
    tenantId: this.tenantId.toString(),
    userId: this.userId ? this.userId.toString() : null,
    driverName: this.driverName,
    vehicleType: this.vehicleType || 'car',
    batteryCapacityKwh: this.batteryCapacityKwh,
    currentCharge: this.currentCharge ?? 20,
    targetCharge: this.targetCharge ?? 80,
    maxChargingPowerKw: this.maxChargingPowerKw || 22,
    arrivalTime: this.arrivalTime?.toISOString?.() || this.arrivalTime,
    departureTime: this.departureTime?.toISOString?.() || this.departureTime,
    priority: this.priorityTier,
    priorityTier: this.priorityTier,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Vehicle', vehicleSchema)
module.exports.PRIORITY_TIERS = PRIORITY_TIERS
module.exports.VEHICLE_TYPES = VEHICLE_TYPES
module.exports.VEHICLE_PRESETS = VEHICLE_PRESETS
