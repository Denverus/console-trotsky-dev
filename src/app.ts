import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import corsPlugin from './plugins/cors'
import mongoPlugin from './plugins/mongo'
import healthRoute from './routes/health'
import authRoutes from './routes/auth'
import companiesRoutes from './routes/companies'
import usersRoutes from './routes/users'
import { config } from './config'

export async function buildApp() {
  const fastify = Fastify({
    logger: config.nodeEnv !== 'test',
  })

  await fastify.register(corsPlugin)
  await fastify.register(fastifyCookie)
  await fastify.register(mongoPlugin)

  await fastify.register(healthRoute)
  await fastify.register(authRoutes, { prefix: '/api/auth' })
  await fastify.register(companiesRoutes, { prefix: '/api/companies' })
  await fastify.register(usersRoutes, { prefix: '/api/users' })

  return fastify
}
