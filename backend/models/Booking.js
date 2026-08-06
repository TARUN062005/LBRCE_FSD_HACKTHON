const mongoose = require('mongoose')

/** Keep `approved` for existing flows; `confirmed` = paid marketplace booking */
const BOOKING_STATUSES = [
  'pending',
  'approved',
  'confirmed',
  'charging',
  'completed',
  'cancelled',
]

const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded']

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },
    chargerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
      required: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    /** Display slot label e.g. "10:00–11:00" */
    slot: { type: String, default: '' },
    duration: { type: Number, default: 60, min: 15 },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending',
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'unpaid',
    },
    notificationSentToTenant: { type: Boolean, default: false },
    notificationSentToUser: { type: Boolean, default: false },
    notes: {
      type: String,
      default: '',
    },
    siteName: { type: String, default: '' },
    chargerLabel: { type: String, default: '' },
    userName: { type: String, default: '' },
    userEmail: { type: String, default: '' },
  },
  { timestamps: true },
)

bookingSchema.methods.toSafeJSON = function toSafeJSON() {
  const bookingStatus = this.status === 'approved' ? 'confirmed' : this.status
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    tenantId: this.tenantId ? this.tenantId.toString() : null,
    chargerId: this.chargerId.toString(),
    stationId: this.siteId.toString(),
    siteId: this.siteId.toString(),
    bookingDate: this.bookingDate,
    date: this.bookingDate,
    startTime: this.startTime,
    endTime: this.endTime,
    slot: this.slot || '',
    duration: this.duration || 60,
    status: this.status,
    bookingStatus,
    estimatedCost: this.estimatedCost,
    amount: this.amount || this.estimatedCost || 0,
    paymentStatus: this.paymentStatus || 'unpaid',
    notificationSentToTenant: Boolean(this.notificationSentToTenant),
    notificationSentToUser: Boolean(this.notificationSentToUser),
    notes: this.notes,
    siteName: this.siteName,
    chargerLabel: this.chargerLabel,
    userName: this.userName,
    userEmail: this.userEmail,
    createdAt: this.createdAt,
  }
}

const Booking = mongoose.model('Booking', bookingSchema)

module.exports = Booking
module.exports.BOOKING_STATUSES = BOOKING_STATUSES
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES
module.exports.ACTIVE_BOOKING_STATUSES = ['pending', 'approved', 'confirmed', 'charging']
