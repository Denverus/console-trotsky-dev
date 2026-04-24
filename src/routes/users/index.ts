import { FastifyPluginAsync } from 'fastify'
import { requireSuperAdmin } from '../../middleware/require-super-admin'
import { listUsers } from './users.service'

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireSuperAdmin)

  fastify.get('/', async (_request, reply) => {
    const users = await listUsers()
    return reply.send({ users })
  })
}

export default usersRoutes
