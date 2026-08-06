const mongoose = require('mongoose')

const STATION_STATUSES = ['pending', 'approved', 'suspended']

const siteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    /** Human-readable location / address line (kept for backward compatibility) */
    location: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    pincode: { type: String, default: '', trim: true },
    photos: { type: [String], default: [] },
    amenities: {
      type: [String],
      default: [],
    },
    /** Display name of host company (no User account required) */
    tenantName: { type: String, default: '', trim: true },
    pricePerKwh: { type: Number, default: 2, min: 0 },
    maxCapacityKw: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    /** Owning charging company (marketplace). Admin-created sites may omit. */
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: STATION_STATUSES,
      default: 'approved',
      index: true,
    },
    workingHours: {
      open: { type: String, default: '08:00' },
      close: { type: String, default: '20:00' },
    },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    /** GeoJSON Point [lng, lat] for $near queries */
    geo: {
      type: {
        type: String,
        enum: ['Point'],
        default: undefined,
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
  },
  { timestamps: true },
)

siteSchema.index({ geo: '2dsphere' })

siteSchema.methods.setCoordinates = function setCoordinates(lat, lng) {
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    this.latitude = null
    this.longitude = null
    this.geo = undefined
    return
  }
  this.latitude = latitude
  this.longitude = longitude
  this.geo = { type: 'Point', coordinates: [longitude, latitude] }
}

siteSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    stationName: this.name,
    location: this.location,
    description: this.description || '',
    address: this.address || this.location,
    city: this.city || '',
    state: this.state || '',
    pincode: this.pincode || '',
    photos: this.photos || [],
    amenities: this.amenities || [],
    tenantName: this.tenantName || '',
    openingTime: this.workingHours?.open || '08:00',
    closingTime: this.workingHours?.close || '20:00',
    pricePerKwh: this.pricePerKwh ?? 14,
    maxCapacityKw: this.maxCapacityKw,
    tenantId: this.tenantId ? this.tenantId.toString() : null,
    status: this.status || 'approved',
    workingHours: this.workingHours || { open: '08:00', close: '20:00' },
    ratingAvg: this.ratingAvg || 0,
    ratingCount: this.ratingCount || 0,
    latitude: this.latitude,
    longitude: this.longitude,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Site', siteSchema)
module.exports.STATION_STATUSES = STATION_STATUSES
