const mongoose = require('mongoose')

const ROLES = ['normal_user', 'tenant_manager', 'admin']

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    picture: {
      type: String,
      default: '',
    },
    /** Original Google avatar — restore when custom photo is removed */
    googlePicture: {
      type: String,
      default: '',
    },
    /** True when user uploaded / set a custom photo */
    customPicture: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    vehicleNumber: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    googleId: {
      type: String,
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
      default: 'normal_user',
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },
    tenantIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }],
      default: [],
    },
  },
  { timestamps: true },
)

userSchema.methods.syncTenantFields = function syncTenantFields() {
  const ids = []
  for (const id of this.tenantIds || []) {
    if (id) ids.push(String(id))
  }
  if (this.tenantId) {
    const primary = String(this.tenantId)
    if (!ids.includes(primary)) ids.unshift(primary)
  }
  const unique = [...new Set(ids)].filter(Boolean)
  // Keep ObjectIds in the document — strings break some mongoose queries after save
  this.tenantIds = unique.map((id) =>
    mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id,
  )
  this.tenantId = unique.length ? this.tenantIds[0] : null
}

userSchema.pre('validate', function validateTenantScope() {
  this.syncTenantFields()
  if (this.role === 'tenant_manager' && !(this.tenantIds?.length || this.tenantId)) {
    throw new Error('tenant_manager requires at least one company (tenantIds)')
  }
  if (this.role === 'admin' || this.role === 'normal_user') {
    this.tenantId = null
    this.tenantIds = []
  }
})

userSchema.methods.profileComplete = function profileComplete() {
  return Boolean(
    this.name &&
      this.email &&
      this.phone &&
      String(this.phone).replace(/\D/g, '').length >= 10 &&
      this.vehicleNumber &&
      String(this.vehicleNumber).trim().length >= 4,
  )
}

userSchema.methods.toSafeJSON = function toSafeJSON(tenantNameById = {}) {
  this.syncTenantFields()
  const tenantIds = (this.tenantIds || []).map((id) => id.toString())
  return {
    id: this._id.toString(),
    userId: this._id.toString(),
    name: this.name,
    email: this.email,
    picture: this.picture || '',
    googlePicture: this.googlePicture || '',
    customPicture: Boolean(this.customPicture),
    phone: this.phone || '',
    vehicleNumber: this.vehicleNumber || '',
    profileComplete: this.profileComplete(),
    role: this.role,
    tenantId: this.tenantId ? this.tenantId.toString() : null,
    tenantIds,
    tenantNames: tenantIds.map((id) => tenantNameById[id] || null).filter(Boolean),
    tenants: tenantIds.map((id) => ({
      id,
      companyName: tenantNameById[id] || 'Company',
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

const User = mongoose.model('User', userSchema)

module.exports = User
module.exports.ROLES = ROLES
