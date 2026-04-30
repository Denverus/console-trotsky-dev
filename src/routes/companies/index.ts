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
} from './companies.service'

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
      return reply.send({ services })
    } catch {
      return reply.status(404).send({ error: 'Company not found' })
    }
  })

  fastify.patch<{ Params: { id: string; keyId: string }; Body: { name: string } }>(
    '/:id/services/:keyId',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 64 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const service = await renameService(request.params.id, request.params.keyId, request.body.name)
        return reply.send({
          _id: service._id.toString(),
          serviceId: service.serviceId,
          name: service.name,
          createdAt: service.createdAt,
          revokedAt: service.revokedAt,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to rename service'
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
