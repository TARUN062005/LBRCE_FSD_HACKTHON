const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
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
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'throttled',
        'completed',
        'info',
        'booking',
        'payment',
        'platform',
        'tenant_registration',
        'station_approval',
        'error',
        'complaint',
        'analytics',
      ],
      default: 'info',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
)

notificationSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    tenantId: this.tenantId ? this.tenantId.toString() : null,
    userId: this.userId ? this.userId.toString() : null,
    sessionId: this.sessionId ? this.sessionId.toString() : null,
    bookingId: this.bookingId ? this.bookingId.toString() : null,
    message: this.message,
    type: this.type,
    read: this.read,
    createdAt: this.createdAt?.toISOString?.() || this.createdAt,
  }
}

module.exports = mongoose.model('Notification', notificationSchema)
