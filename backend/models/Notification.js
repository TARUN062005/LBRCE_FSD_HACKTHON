const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['throttled', 'completed', 'info'],
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
    tenantId: this.tenantId.toString(),
    sessionId: this.sessionId ? this.sessionId.toString() : null,
    message: this.message,
    type: this.type,
    read: this.read,
    createdAt: this.createdAt?.toISOString?.() || this.createdAt,
  }
}

module.exports = mongoose.model('Notification', notificationSchema)
