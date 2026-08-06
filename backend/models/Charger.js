const mongoose = require('mongoose')

const CHARGER_STATUSES = ['available', 'in_use', 'offline']
const CHARGER_TYPES = ['AC', 'DC', 'Type2', 'CCS', 'CHAdeMO', 'GB/T']

const chargerSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    maxPowerKw: {
      type: Number,
      required: true,
      min: 0.1,
    },
    chargerType: {
      type: String,
      enum: CHARGER_TYPES,
      default: 'Type2',
    },
    status: {
      type: String,
      enum: CHARGER_STATUSES,
      default: 'available',
    },
  },
  { timestamps: true },
)

chargerSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    siteId: this.siteId?.toString?.() || String(this.siteId),
    label: this.label,
    maxPowerKw: this.maxPowerKw,
    chargerType: this.chargerType || 'Type2',
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Charger', chargerSchema)
module.exports.CHARGER_STATUSES = CHARGER_STATUSES
module.exports.CHARGER_TYPES = CHARGER_TYPES
