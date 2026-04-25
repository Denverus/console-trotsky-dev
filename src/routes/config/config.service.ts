import { AppConfig, IAppConfig } from '../../models/app-config.model'

const SINGLETON_FILTER = { _key: 'singleton' }
const DEFAULT_CONFIG = { registrationEnabled: true, createUsersAsInactive: false }

export async function getAppConfig(): Promise<IAppConfig> {
  const doc = await AppConfig.findOneAndUpdate(
    SINGLETON_FILTER,
    { $setOnInsert: DEFAULT_CONFIG },
    { upsert: true, new: true },
  )
  return doc!
}

export async function updateAppConfig(patch: Partial<{ registrationEnabled: boolean }>): Promise<IAppConfig> {
  const doc = await AppConfig.findOneAndUpdate(
    SINGLETON_FILTER,
    { $set: patch },
    { upsert: true, new: true },
  )
  return doc!
}
