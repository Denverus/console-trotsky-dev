import crypto from 'crypto'
import { Company, ICompany, PlanTier } from '../../models/company.model'
import { ApiKey, IApiKey, ServiceId } from '../../models/api-key.model'
import mongoose from 'mongoose'

export async function createCompany(name: string, slug: string, planTier: PlanTier = 'free'): Promise<ICompany> {
  const existing = await Company.findOne({ slug: slug.toLowerCase() })
  if (existing) throw new Error('Slug already taken')
  return Company.create({ name, slug, planTier })
}

export async function listCompanies(): Promise<ICompany[]> {
  return Company.find().sort({ createdAt: -1 })
}

export async function getCompany(id: string): Promise<ICompany> {
  const company = await Company.findById(id)
  if (!company) throw new Error('Company not found')
  return company
}

export interface AssignServiceResult {
  plaintext: string
  keyId: string
  serviceId: ServiceId
}

export async function assignService(
  companyId: string,
  serviceId: ServiceId,
): Promise<AssignServiceResult> {
  await getCompany(companyId)

  const existing = await ApiKey.findOne({
    companyId: new mongoose.Types.ObjectId(companyId),
    serviceId,
    revokedAt: { $exists: false },
  })
  if (existing) throw new Error(`Service ${serviceId} already assigned to this company`)

  const plaintext = crypto.randomBytes(32).toString('hex')
  const keyHash = crypto.createHash('sha256').update(plaintext).digest('hex')

  const apiKey = await ApiKey.create({
    companyId: new mongoose.Types.ObjectId(companyId),
    serviceId,
    keyHash,
  })

  return { plaintext, keyId: apiKey._id.toString(), serviceId }
}

export async function listServices(companyId: string): Promise<IApiKey[]> {
  await getCompany(companyId)
  return ApiKey.find({ companyId: new mongoose.Types.ObjectId(companyId) }).sort({ createdAt: -1 })
}

export async function revokeService(companyId: string, serviceId: ServiceId): Promise<void> {
  const result = await ApiKey.updateMany(
    {
      companyId: new mongoose.Types.ObjectId(companyId),
      serviceId,
      revokedAt: { $exists: false },
    },
    { revokedAt: new Date() },
  )
  if (result.matchedCount === 0) throw new Error('No active key found for this service')
}

export async function regenerateService(
  companyId: string,
  serviceId: ServiceId,
): Promise<AssignServiceResult> {
  await revokeService(companyId, serviceId)
  return assignService(companyId, serviceId)
}
