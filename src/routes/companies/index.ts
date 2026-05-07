import { FastifyPluginAsync } from 'fastify'
import { requireSuperAdmin } from '../../middleware/require-super-admin'
import { ServiceId } from '../../models/api-key.model'
import { PlanTier } from '../../models/company.model'
import {
  createCompany,
  listCompanies,
  getCompany,
  assignService,
  listServices,
  renameService,
  revokeServiceById,
  regenerateServiceById,
  updateAllowedOrigins,
} from './companies.service'
import { IApiKey } from '../../models/api-key.model'

function serializeApiKey(key: IApiKey) {
  return {
    _id: key._id.toString(),
    serviceId: key.serviceId,
    name: key.name,
    allowedOrigins: key.allowedOrigins ?? [],
    createdAt: key.createdAt,
    revokedAt: key.revokedAt,
  }
}

const companiesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireSuperAdmin)

  fastify.post<{ Body: { name: string; slug: string; planTier?: PlanTier } }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'slug'],
          properties: {
            name: { type: 'string', minLength: 1 },
            slug: { type: 'string', minLength: 1, pattern: '^[a-z0-9-]+$' },
            planTier: { type: 'string', enum: ['free', 'starter', 'pro'] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const company = await createCompany(request.body.name, request.body.slug, request.body.planTier)
        return reply.status(201).send({ company })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create company'
        return reply.status(409).send({ error: message })
      }
    },
  )

  fastify.get('/', async (_request, reply) => {
    const companies = await listCompanies()
    return reply.send({ companies })
  })

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const company = await getCompany(request.params.id)
      return reply.send({ company })
    } catch {
      return reply.status(404).send({ error: 'Company not found' })
    }
  })

  fastify.post<{ Params: { id: string }; Body: { serviceId: ServiceId; name: string } }>(
    '/:id/services',
    {
      schema: {
        body: {
          type: 'object',
          required: ['serviceId', 'name'],
          properties: {
            serviceId: { type: 'string', enum: ['analytics', 'payments', 'email', 'logs'] },
            name: { type: 'string', minLength: 1, maxLength: 64 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await assignService(request.params.id, request.body.serviceId, request.body.name)
        return reply.status(201).send(result)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to assign service'
        return reply.status(409).send({ error: message })
      }
    },
  )

  fastify.get<{ Params: { id: string } }>('/:id/services', async (request, reply) => {
    try {
      const services = await listServices(request.params.id)
      return reply.send({ services: services.map(serializeApiKey) })
    } catch {
      return reply.status(404).send({ error: 'Company not found' })
    }
  })

  fastify.patch<{
    Params: { id: string; keyId: string }
    Body: { name?: string; allowedOrigins?: string[] }
  }>(
    '/:id/services/:keyId',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 64 },
            allowedOrigins: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
              maxItems: 32,
            },
          },
          anyOf: [{ required: ['name'] }, { required: ['allowedOrigins'] }],
        },
      },
    },
    async (request, reply) => {
      try {
        let service: IApiKey | undefined
        if (request.body.name !== undefined) {
          service = await renameService(request.params.id, request.params.keyId, request.body.name)
        }
        if (request.body.allowedOrigins !== undefined) {
          service = await updateAllowedOrigins(
            request.params.id,
            request.params.keyId,
            request.body.allowedOrigins,
          )
        }
        if (!service) {
          return reply.status(400).send({ error: 'No fields to update' })
        }
        return reply.send(serializeApiKey(service))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update service'
        const status = message === 'Service not found' || message === 'Invalid key id' ? 404 : 409
        return reply.status(status).send({ error: message })
      }
    },
  )

  fastify.delete<{ Params: { id: string; keyId: string } }>(
    '/:id/services/:keyId',
    async (request, reply) => {
      try {
        await revokeServiceById(request.params.id, request.params.keyId)
        return reply.send({ ok: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to revoke service'
        const status = message === 'Service not found' || message === 'Invalid key id' ? 404 : 409
        return reply.status(status).send({ error: message })
      }
    },
  )

  fastify.post<{ Params: { id: string; keyId: string } }>(
    '/:id/services/:keyId/regenerate',
    async (request, reply) => {
      try {
        const result = await regenerateServiceById(request.params.id, request.params.keyId)
        return reply.send(result)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to regenerate key'
        const status = message === 'Service not found' || message === 'Invalid key id' ? 404 : 409
        return reply.status(status).send({ error: message })
      }
    },
  )
}

export default companiesRoutes
