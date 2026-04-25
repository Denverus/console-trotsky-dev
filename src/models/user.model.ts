import mongoose, { Schema, Document } from 'mongoose'

export type UserRole = 'superadmin' | 'admin'

export interface IUser extends Document {
  email: string
  passwordHash: string
  role: UserRole
  isActive: boolean
  companyId?: mongoose.Types.ObjectId
  firstName?: string
  lastName?: string
  lastLoginAt?: Date
  createdAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin'], required: true },
    isActive: { type: Boolean, default: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const User = mongoose.model<IUser>('User', UserSchema)
