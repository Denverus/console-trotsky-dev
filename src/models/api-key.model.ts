import mongoose, { Schema, Document } from 'mongoose'

export type ServiceId = 'analytics' | 'payments' | 'email' | 'logs'

export interface IApiKey extends Document {
  companyId: mongoose.Types.ObjectId
  serviceId: ServiceId
  name: string
  keyHash: string
  createdAt: Date
  revokedAt?: Date
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    serviceId: { type: String, enum: ['analytics', 'payments', 'email', 'logs'], required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 64 },
    keyHash: { type: String, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

ApiKeySchema.index({ companyId: 1, serviceId: 1 })
ApiKeySchema.index({ companyId: 1, serviceId: 1, name: 1 })
ApiKeySchema.index({ keyHash: 1 })

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema)
