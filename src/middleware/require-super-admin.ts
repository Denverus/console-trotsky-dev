import { FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from './require-auth'

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply)
  if (reply.sent) return
  if (request.user?.role !== 'superadmin') {
    reply.status(403).send({ error: 'Forbidden' })
  }
}
