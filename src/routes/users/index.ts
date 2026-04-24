import { FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../../middleware/require-auth'
import { requireSuperAdmin } from '../../middleware/require-super-admin'
import {
  listUsers,
  getUserById,
  updateUserProfile,
  setPassword,
  verifyAndChangePassword,
} from './users.service'

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: requireSuperAdmin }, async (_request, reply) => {
    const users = await listUsers()
    return reply.send({ users })
  })

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      try {
        const user = await getUserById(request.params.id)
        return reply.send({ user })
      } catch {
        return reply.status(404).send({ error: 'User not found' })
      }
    },
  )

  fastify.patch<{ Params: { id: string }; Body: { firstName?: string; lastName?: string } }>(
    '/:id',
    {
      preHandler: requireSuperAdmin,
      schema: {
        body: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      await updateUserProfile(request.params.id, request.body)
      return reply.send({ ok: true })
    },
  )

  fastify.patch<{ Params: { id: string }; Body: { oldPassword?: string; newPassword: string } }>(
    '/:id/password',
    {
      preHandler: requireAuth,
      schema: {
        body: {
          type: 'object',
          required: ['newPassword'],
          properties: {
            oldPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { oldPassword, newPassword } = request.body
      const callerId = request.user!.userId
      const callerRole = request.user!.role

      if (callerRole === 'superadmin') {
        await setPassword(id, newPassword)
        return reply.send({ ok: true })
      }

      if (callerId !== id) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      if (!oldPassword) {
        return reply.status(400).send({ error: 'Current password required' })
      }

      try {
        await verifyAndChangePassword(id, oldPassword, newPassword)
        return reply.send({ ok: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to change password'
        return reply.status(400).send({ error: message })
      }
    },
  )
}

export default usersRoutes
