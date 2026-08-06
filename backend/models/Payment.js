const mongoose = require('mongoose')

const PAYMENT_STATUSES = ['paid', 'failed', 'cancelled']
const PAYMENT_METHODS = ['upi', 'card', 'netbanking', 'wallet']

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      default: null,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'upi',
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'paid',
      index: true,
    },
    provider: { type: String, default: 'razorpay_demo' },
    meta: {
      stationName: { type: String, default: '' },
      chargerLabel: { type: String, default: '' },
      energyCost: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      estimatedKwh: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
)

paymentSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    paymentId: this.paymentId,
    orderId: this.orderId,
    userId: this.userId.toString(),
    stationId: this.stationId ? this.stationId.toString() : null,
    bookingId: this.bookingId ? this.bookingId.toString() : null,
    amount: Number((this.amount || 0).toFixed(2)),
    currency: this.currency || 'INR',
    method: this.method,
    status: this.status,
    provider: this.provider,
    meta: this.meta || {},
    timestamp: this.createdAt,
    createdAt: this.createdAt,
  }
}

module.exports = mongoose.model('Payment', paymentSchema)
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES
module.exports.PAYMENT_METHODS = PAYMENT_METHODS
