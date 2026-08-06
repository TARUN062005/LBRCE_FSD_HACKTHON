const mongoose = require('mongoose')

const CHARGER_STATUSES = ['available', 'in_use', 'offline']
const CHARGER_TYPES = ['AC', 'DC', 'Type2', 'CCS', 'CHAdeMO', 'GB/T', 'bike', 'car', 'fast', 'ultra']

/** Power presets by connector class */
const CHARGER_PRESETS = {
  bike: { maxPowerKw: 3, voltage: 230 },
  car: { maxPowerKw: 22, voltage: 400 },
  fast: { maxPowerKw: 80, voltage: 400 },
  ultra: { maxPowerKw: 150, voltage: 800 },
}

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
    connectorType: {
      type: String,
      default: 'Type2',
    },
    currentAllocatedPower: {
      type: Number,
      default: 0,
      min: 0,
    },
    voltage: {
      type: Number,
      default: 400,
      min: 0,
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
    chargerId: this._id.toString(),
    siteId: this.siteId?.toString?.() || String(this.siteId),
    label: this.label,
    maxPowerKw: this.maxPowerKw,
    chargerType: this.chargerType || 'Type2',
    connectorType: this.connectorType || this.chargerType || 'Type2',
    currentAllocatedPower: this.currentAllocatedPower || 0,
    voltage: this.voltage || 400,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Charger', chargerSchema)
module.exports.CHARGER_STATUSES = CHARGER_STATUSES
module.exports.CHARGER_TYPES = CHARGER_TYPES
module.exports.CHARGER_PRESETS = CHARGER_PRESETS
