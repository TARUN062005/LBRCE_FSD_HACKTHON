const mongoose = require('mongoose')

const lineItemSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    kWh: { type: Number, required: true, min: 0 },
    tariffRate: { type: Number, required: true, min: 0 },
    tariffBand: { type: String, default: 'normal' },
    amount: { type: Number, required: true, min: 0 },
    driverName: { type: String, default: '' },
    chargerLabel: { type: String, default: '' },
    deliveredAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const invoiceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    /** Demo billing period key, e.g. "2026-08" */
    period: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    totalKwh: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sessionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
      },
    ],
    lineItems: [lineItemSchema],
    companyName: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
)

invoiceSchema.index({ tenantId: 1, period: 1, status: 1 })

invoiceSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    tenantId: this.tenantId.toString(),
    period: this.period,
    status: this.status,
    totalKwh: Number((this.totalKwh || 0).toFixed(3)),
    amount: Number((this.amount || 0).toFixed(4)),
    sessionIds: (this.sessionIds || []).map((id) => id.toString()),
    lineItems: (this.lineItems || []).map((li) => ({
      sessionId: li.sessionId.toString(),
      kWh: Number((li.kWh || 0).toFixed(3)),
      tariffRate: li.tariffRate,
      tariffBand: li.tariffBand,
      amount: Number((li.amount || 0).toFixed(4)),
      driverName: li.driverName,
      chargerLabel: li.chargerLabel,
      deliveredAt: li.deliveredAt?.toISOString?.() || li.deliveredAt,
    })),
    companyName: this.companyName,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Invoice', invoiceSchema)
