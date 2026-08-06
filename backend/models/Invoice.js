const mongoose = require('mongoose')

const GST_RATE = 0.18

const lineItemSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    stationName: { type: String, default: '' },
    chargerId: { type: String, default: '' },
    kWh: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, default: 0 },
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
      default: null,
      index: true,
    },
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
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    totalKwh: { type: Number, default: 0, min: 0 },
    /** Pre-tax subtotal */
    subtotal: { type: Number, default: 0, min: 0 },
    gstRate: { type: Number, default: GST_RATE },
    gstAmount: { type: Number, default: 0, min: 0 },
    /** Grand total including GST */
    amount: { type: Number, default: 0, min: 0 },
    tariffRate: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 },
    stationName: { type: String, default: '' },
    chargerId: { type: String, default: '' },
    paymentId: { type: String, default: '' },
    orderId: { type: String, default: '' },
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
  const rate = this.gstRate ?? GST_RATE
  let subtotal = this.subtotal
  if (subtotal == null) {
    subtotal = (this.amount || 0) / (1 + rate)
  }
  subtotal = Number(Number(subtotal || 0).toFixed(2))
  const gstAmount = Number(Number(this.gstAmount || 0).toFixed(2))
  const total = Number(Number(this.amount || 0).toFixed(2))
  return {
    id: this._id.toString(),
    invoiceId: this._id.toString(),
    tenantId: this.tenantId ? this.tenantId.toString() : null,
    userId: this.userId ? this.userId.toString() : null,
    period: this.period,
    status: this.status,
    paymentStatus: this.paymentStatus || 'unpaid',
    totalKwh: Number((this.totalKwh || 0).toFixed(3)),
    energyConsumed: Number((this.totalKwh || 0).toFixed(3)),
    subtotal,
    gstRate: rate,
    gst: gstAmount,
    gstAmount,
    amount: total,
    totalAmount: total,
    tariffRate: this.tariffRate || 0,
    pricePerKwh: this.tariffRate || 0,
    durationMinutes: this.durationMinutes || 0,
    chargingDuration: this.durationMinutes || 0,
    stationName: this.stationName || '',
    chargerId: this.chargerId || '',
    paymentId: this.paymentId || '',
    orderId: this.orderId || '',
    sessionIds: (this.sessionIds || []).map((id) => id.toString()),
    bookingIds: (this.bookingIds || []).map((id) => id.toString()),
    lineItems: (this.lineItems || []).map((li) => ({
      sessionId: li.sessionId ? li.sessionId.toString() : null,
      bookingId: li.bookingId ? li.bookingId.toString() : null,
      stationName: li.stationName || '',
      chargerId: li.chargerId || '',
      kWh: Number((li.kWh || 0).toFixed(3)),
      durationMinutes: li.durationMinutes || 0,
      tariffRate: li.tariffRate,
      tariffBand: li.tariffBand,
      amount: Number((li.amount || 0).toFixed(2)),
      driverName: li.driverName,
      chargerLabel: li.chargerLabel,
      deliveredAt: li.deliveredAt?.toISOString?.() || li.deliveredAt,
    })),
    companyName: this.companyName,
    customerName: this.customerName,
    userName: this.customerName,
    customerEmail: this.customerEmail,
    generatedAt: this.generatedAt?.toISOString?.() || this.generatedAt,
    dateTime: this.generatedAt?.toISOString?.() || this.generatedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Invoice', invoiceSchema)
module.exports.GST_RATE = GST_RATE
