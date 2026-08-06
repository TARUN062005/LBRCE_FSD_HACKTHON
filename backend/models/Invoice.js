const mongoose = require('mongoose')

const lineItemSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
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
    /** Fleet invoice (tenant) — mutually exclusive with userId for driver invoices */
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },
    /** Driver invoice (normal_user) */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    period: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'paid'],
      default: 'open',
    },
    totalKwh: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
    tariffRate: { type: Number, default: 0 },
    sessionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
    bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    lineItems: [lineItemSchema],
    companyName: { type: String, default: '' },
    customerName: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

invoiceSchema.index({ tenantId: 1, period: 1, status: 1 })
invoiceSchema.index({ userId: 1, period: 1, status: 1 })

invoiceSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    invoiceId: this._id.toString(),
    tenantId: this.tenantId ? this.tenantId.toString() : null,
    userId: this.userId ? this.userId.toString() : null,
    period: this.period,
    status: this.status,
    totalKwh: Number((this.totalKwh || 0).toFixed(3)),
    amount: Number((this.amount || 0).toFixed(4)),
    totalAmount: Number((this.amount || 0).toFixed(4)),
    tariffRate: this.tariffRate || 0,
    sessionIds: (this.sessionIds || []).map((id) => id.toString()),
    bookingIds: (this.bookingIds || []).map((id) => id.toString()),
    lineItems: (this.lineItems || []).map((li) => ({
      sessionId: li.sessionId ? li.sessionId.toString() : null,
      bookingId: li.bookingId ? li.bookingId.toString() : null,
      kWh: Number((li.kWh || 0).toFixed(3)),
      tariffRate: li.tariffRate,
      tariffBand: li.tariffBand,
      amount: Number((li.amount || 0).toFixed(4)),
      driverName: li.driverName,
      chargerLabel: li.chargerLabel,
      deliveredAt: li.deliveredAt?.toISOString?.() || li.deliveredAt,
    })),
    companyName: this.companyName,
    customerName: this.customerName,
    customerEmail: this.customerEmail,
    generatedAt: this.generatedAt?.toISOString?.() || this.generatedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Invoice', invoiceSchema)
