import mongoose, { Schema, Document } from 'mongoose'

export interface IAppConfig extends Document {
  _key: 'singleton'
  registrationEnabled: boolean
  updatedAt: Date
}

const AppConfigSchema = new Schema<IAppConfig>(
  {
    _key: { type: String, default: 'singleton', immutable: true },
    registrationEnabled: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
)

AppConfigSchema.index({ _key: 1 }, { unique: true })

export const AppConfig = mongoose.model<IAppConfig>('AppConfig', AppConfigSchema)
