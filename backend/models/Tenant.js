const mongoose = require('mongoose')

const BILLING_PLANS = ['basic', 'standard', 'premium']
const TENANT_STATUSES = ['pending', 'approved', 'suspended']

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
    /** Primary / first station — optional for self-registered tenants until first station */
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: TENANT_STATUSES,
      default: 'approved',
      index: true,
    },
    description: { type: String, default: '' },
  },
  { timestamps: true },
)

tenantSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    companyName: this.companyName,
    billingPlan: this.billingPlan,
    siteId: this.siteId ? this.siteId.toString() : null,
    status: this.status || 'approved',
    description: this.description || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('Tenant', tenantSchema)
module.exports.BILLING_PLANS = BILLING_PLANS
module.exports.TENANT_STATUSES = TENANT_STATUSES
