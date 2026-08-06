const mongoose = require('mongoose')

const BILLING_PLANS = ['basic', 'standard', 'premium']

const tenantSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    billingPlan: {
      type: String,
      enum: BILLING_PLANS,
      default: 'standard',
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
)

tenantSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    companyName: this.companyName,
    billingPlan: this.billingPlan,
    siteId: this.siteId?.toString?.() || String(this.siteId),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Tenant', tenantSchema)
module.exports.BILLING_PLANS = BILLING_PLANS
