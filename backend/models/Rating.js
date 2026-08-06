const mongoose = require('mongoose')

const ratingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true },
)

ratingSchema.index({ userId: 1, siteId: 1 }, { unique: true })

ratingSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    siteId: this.siteId.toString(),
    bookingId: this.bookingId ? this.bookingId.toString() : null,
    rating: this.rating,
    comment: this.comment || '',
    createdAt: this.createdAt,
  }
}

module.exports = mongoose.model('Rating', ratingSchema)
