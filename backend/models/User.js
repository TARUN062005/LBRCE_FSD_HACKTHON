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
    googleId: {
      type: String,
      default: null,
      index: true,
    },
    passwordHash: {
      type: String,
      required: false,
      select: false,
      default: null,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
      default: 'normal_user',
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
)

userSchema.pre('validate', function validateTenantScope() {
  if (this.role === 'tenant_manager' && !this.tenantId) {
    throw new Error('tenant_manager requires a tenantId')
  }
  if (this.role === 'admin' || this.role === 'normal_user') {
    this.tenantId = null
  }
})

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    userId: this._id.toString(),
    name: this.name,
    email: this.email,
    picture: this.picture || '',
    role: this.role,
    tenantId: this.tenantId ? this.tenantId.toString() : null,
  }
}

const User = mongoose.model('User', userSchema)

module.exports = User
module.exports.ROLES = ROLES
