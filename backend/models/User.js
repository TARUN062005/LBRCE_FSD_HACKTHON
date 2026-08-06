const mongoose = require('mongoose')

const ROLES = ['admin', 'tenant_manager']

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
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      // Admins have no tenant; tenant_manager must have one
    },
  },
  { timestamps: true },
)

userSchema.pre('validate', function validateTenantScope() {
  if (this.role === 'tenant_manager' && !this.tenantId) {
    throw new Error('tenant_manager requires a tenantId')
  }
  if (this.role === 'admin') {
    this.tenantId = null
  }
})

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    tenantId: this.tenantId ? this.tenantId.toString() : null,
  }
}

const User = mongoose.model('User', userSchema)

module.exports = User
module.exports.ROLES = ROLES
