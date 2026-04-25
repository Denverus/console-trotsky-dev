import { FastifyPluginAsync } from 'fastify'
import { requireSuperAdmin } from '../../middleware/require-super-admin'
import { getAppConfig, updateAppConfig } from './config.service'

const configRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireSuperAdmin)

  fastify.get('/', async (_request, reply) => {
    const cfg = await getAppConfig()
    return reply.send({ config: { registrationEnabled: cfg.registrationEnabled, createUsersAsInactive: cfg.createUsersAsInactive } })
  })

  fastify.patch<{ Body: { registrationEnabled?: boolean; createUsersAsInactive?: boolean } }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            registrationEnabled: { type: 'boolean' },
            createUsersAsInactive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const cfg = await updateAppConfig(request.body)
      return reply.send({ config: { registrationEnabled: cfg.registrationEnabled, createUsersAsInactive: cfg.createUsersAsInactive } })
    },
  )
}

export default configRoutes
