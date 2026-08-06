const mongoose = require('mongoose')

/** Stable enum values for the optimizer (Task 6). */
const PRIORITY_TIERS = ['low', 'medium', 'high', 'sla']

const vehicleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    batteryCapacityKwh: {
      type: Number,
      required: true,
      min: 1,
    },
    /** Optimizer input — keep name stable. */
    priorityTier: {
      type: String,
      enum: PRIORITY_TIERS,
      required: true,
      default: 'medium',
    },
    /** Optimizer input — keep name stable. Target departure datetime (UTC). */
    departureTime: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
)

vehicleSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    tenantId: this.tenantId.toString(),
    driverName: this.driverName,
    batteryCapacityKwh: this.batteryCapacityKwh,
    priorityTier: this.priorityTier,
    departureTime: this.departureTime?.toISOString?.() || this.departureTime,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Vehicle', vehicleSchema)
module.exports.PRIORITY_TIERS = PRIORITY_TIERS
