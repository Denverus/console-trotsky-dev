import mongoose, { Schema, Document } from 'mongoose'

export type PlanTier = 'free' | 'starter' | 'pro'

export interface ICompany extends Document {
  name: string
  slug: string
  planTier: PlanTier
  createdAt: Date
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    planTier: { type: String, enum: ['free', 'starter', 'pro'], default: 'free' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const Company = mongoose.model<ICompany>('Company', CompanySchema)
