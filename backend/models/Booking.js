const mongoose = require('mongoose')

/** Keep `approved` for existing flows; `confirmed` = paid marketplace booking */
const BOOKING_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'confirmed',
  'charging',
  'completed',
  'cancelled',
  'offered',
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
    paymentId: { type: String, default: '' },
    orderId: { type: String, default: '' },
    paymentMethod: { type: String, default: '' },
    energyCost: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    estimatedKwh: { type: Number, default: null },
    notificationSentToTenant: { type: Boolean, default: false },
    notificationSentToUser: { type: Boolean, default: false },
    chargingStartedAt: { type: Date, default: null },
    chargingEndedAt: { type: Date, default: null },
    energyConsumed: { type: Number, default: null },
    notes: {
      type: String,
      default: '',
    },
    /** Driver-declared vehicle profile (used for grid sort + fair billing). */
    vehicleType: {
      type: String,
      enum: ['bike', 'car', 'bus', 'truck', ''],
      default: '',
    },
    currentCharge: { type: Number, default: null, min: 0, max: 100 },
    targetCharge: { type: Number, default: null, min: 0, max: 100 },
    batteryCapacityKwh: { type: Number, default: null, min: 0 },
    paidAt: { type: Date, default: null },
    /** Set on tenant approve after optimizer runs */
    estimatedChargeMinutes: { type: Number, default: null },
    assignedPole: { type: String, default: '' },
    allocatedPowerKw: { type: Number, default: null },
    queuePosition: { type: Number, default: null },
    /** granted | offered | rejected_offer | full */
    grantStatus: { type: String, default: '' },
    fillOrder: { type: Number, default: null },
    offeredStartTime: { type: Date, default: null },
    offeredEndTime: { type: Date, default: null },
    offeredChargerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
      default: null,
    },
    offeredChargerLabel: { type: String, default: '' },
    offeredSlot: { type: String, default: '' },
    grantMessage: { type: String, default: '' },
    siteName: { type: String, default: '' },
    chargerLabel: { type: String, default: '' },
    userName: { type: String, default: '' },
    userEmail: { type: String, default: '' },
    userPhone: { type: String, default: '' },
    vehicleNumber: { type: String, default: '' },
  },
  { timestamps: true },
)

bookingSchema.methods.toSafeJSON = function toSafeJSON() {
  const bookingStatus = this.status === 'approved' ? 'confirmed' : this.status
  return {
    id: this._id.toString(),
    userId: this.userId ? this.userId.toString() : null,
    tenantId: this.tenantId ? this.tenantId.toString() : null,
    chargerId: this.chargerId ? this.chargerId.toString() : null,
    stationId: this.siteId ? this.siteId.toString() : null,
    siteId: this.siteId ? this.siteId.toString() : null,
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
    paymentId: this.paymentId || '',
    orderId: this.orderId || '',
    paymentMethod: this.paymentMethod || '',
    energyCost: this.energyCost || 0,
    platformFee: this.platformFee || 0,
    gstAmount: this.gstAmount || 0,
    estimatedKwh: this.estimatedKwh,
    notificationSentToTenant: Boolean(this.notificationSentToTenant),
    notificationSentToUser: Boolean(this.notificationSentToUser),
    chargingStartedAt: this.chargingStartedAt,
    chargingEndedAt: this.chargingEndedAt,
    energyConsumed: this.energyConsumed,
    notes: this.notes,
    vehicleType: this.vehicleType || '',
    currentCharge: this.currentCharge,
    targetCharge: this.targetCharge,
    batteryCapacityKwh: this.batteryCapacityKwh,
    paidAt: this.paidAt,
    estimatedChargeMinutes: this.estimatedChargeMinutes,
    assignedPole: this.assignedPole || this.chargerLabel || '',
    allocatedPowerKw: this.allocatedPowerKw,
    queuePosition: this.queuePosition,
    grantStatus: this.grantStatus || '',
    fillOrder: this.fillOrder,
    offeredStartTime: this.offeredStartTime,
    offeredEndTime: this.offeredEndTime,
    offeredChargerId: this.offeredChargerId
      ? this.offeredChargerId.toString()
      : null,
    offeredChargerLabel: this.offeredChargerLabel || '',
    offeredSlot: this.offeredSlot || '',
    grantMessage: this.grantMessage || '',
    siteName: this.siteName,
    chargerLabel: this.chargerLabel,
    userName: this.userName,
    userEmail: this.userEmail,
    userPhone: this.userPhone || '',
    vehicleNumber: this.vehicleNumber || '',
    createdAt: this.createdAt,
  }
}

const Booking = mongoose.model('Booking', bookingSchema)

module.exports = Booking
module.exports.BOOKING_STATUSES = BOOKING_STATUSES
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES
module.exports.ACTIVE_BOOKING_STATUSES = ['pending', 'approved', 'confirmed', 'charging']
