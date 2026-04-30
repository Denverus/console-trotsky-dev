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
  name: string
}

function normalizeName(name: string): string {
  return name.trim()
}

export async function assignService(
  companyId: string,
  serviceId: ServiceId,
  name: string,
): Promise<AssignServiceResult> {
  await getCompany(companyId)

  const trimmed = normalizeName(name)
  if (!trimmed) throw new Error('Name is required')
  if (trimmed.length > 64) throw new Error('Name must be 64 characters or fewer')

  const duplicate = await ApiKey.findOne({
    companyId: new mongoose.Types.ObjectId(companyId),
    serviceId,
    name: trimmed,
    revokedAt: { $exists: false },
  })
  if (duplicate) {
    throw new Error(`An active "${serviceId}" service named "${trimmed}" already exists for this company`)
  }

  const plaintext = crypto.randomBytes(32).toString('hex')
  const keyHash = crypto.createHash('sha256').update(plaintext).digest('hex')

  const apiKey = await ApiKey.create({
    companyId: new mongoose.Types.ObjectId(companyId),
    serviceId,
    name: trimmed,
    keyHash,
  })

  return { plaintext, keyId: apiKey._id.toString(), serviceId, name: apiKey.name }
}

export async function listServices(companyId: string): Promise<IApiKey[]> {
  await getCompany(companyId)
  return ApiKey.find({ companyId: new mongoose.Types.ObjectId(companyId) }).sort({ createdAt: -1 })
}

async function getKeyForCompany(companyId: string, keyId: string): Promise<IApiKey> {
  if (!mongoose.Types.ObjectId.isValid(keyId)) throw new Error('Invalid key id')
  const key = await ApiKey.findOne({
    _id: new mongoose.Types.ObjectId(keyId),
    companyId: new mongoose.Types.ObjectId(companyId),
  })
  if (!key) throw new Error('Service not found')
  return key
}

export async function renameService(companyId: string, keyId: string, name: string): Promise<IApiKey> {
  const key = await getKeyForCompany(companyId, keyId)
  const trimmed = normalizeName(name)
  if (!trimmed) throw new Error('Name is required')
  if (trimmed.length > 64) throw new Error('Name must be 64 characters or fewer')

  if (trimmed === key.name) return key

  const duplicate = await ApiKey.findOne({
    _id: { $ne: key._id },
    companyId: key.companyId,
    serviceId: key.serviceId,
    name: trimmed,
    revokedAt: { $exists: false },
  })
  if (duplicate) {
    throw new Error(`An active "${key.serviceId}" service named "${trimmed}" already exists for this company`)
  }

  key.name = trimmed
  await key.save()
  return key
}

export async function revokeServiceById(companyId: string, keyId: string): Promise<void> {
  const key = await getKeyForCompany(companyId, keyId)
  if (key.revokedAt) throw new Error('Service is already revoked')
  key.revokedAt = new Date()
  await key.save()
}

export async function regenerateServiceById(
  companyId: string,
  keyId: string,
): Promise<AssignServiceResult> {
  const key = await getKeyForCompany(companyId, keyId)
  if (!key.revokedAt) {
    key.revokedAt = new Date()
    await key.save()
  }
  return assignService(companyId, key.serviceId, key.name)
}
