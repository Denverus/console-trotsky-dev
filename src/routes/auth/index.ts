import { FastifyPluginAsync } from 'fastify'
import { registerUser, loginUser, refreshAccessToken } from './auth.service'

const REFRESH_COOKIE = 'refreshToken'
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: { email: string; password: string } }>(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { accessToken, refreshToken, user } = await registerUser(
          request.body.email,
          request.body.password,
        )
        reply.setCookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS)
        return reply.status(201).send({ accessToken, user })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed'
        return reply.status(409).send({ error: message })
      }
    },
  )

  fastify.post<{ Body: { email: string; password: string } }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { accessToken, refreshToken, user } = await loginUser(
          request.body.email,
          request.body.password,
        )
        reply.setCookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS)
        return reply.send({ accessToken, user })
      } catch {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }
    },
  )

  fastify.post('/refresh', async (request, reply) => {
    const token = request.cookies?.[REFRESH_COOKIE]
    if (!token) return reply.status(401).send({ error: 'No refresh token' })

    try {
      const { accessToken } = await refreshAccessToken(token)
      return reply.send({ accessToken })
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' })
    }
  })

  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie(REFRESH_COOKIE, { path: '/' })
    return reply.send({ ok: true })
  })
}

export default authRoutes
