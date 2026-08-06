const mongoose = require('mongoose')

const BOOKING_STATUSES = ['pending', 'approved', 'charging', 'completed', 'cancelled']

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending',
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    // Denormalized for UI
    siteName: { type: String, default: '' },
    chargerLabel: { type: String, default: '' },
    userName: { type: String, default: '' },
    userEmail: { type: String, default: '' },
  },
  { timestamps: true },
)

bookingSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    chargerId: this.chargerId.toString(),
    siteId: this.siteId.toString(),
    bookingDate: this.bookingDate,
    startTime: this.startTime,
    endTime: this.endTime,
    status: this.status,
    estimatedCost: this.estimatedCost,
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
