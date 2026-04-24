import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User, IUser } from '../../models/user.model'
import { config } from '../../config'

interface AuthResult {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; role: string }
}

export async function registerUser(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
): Promise<AuthResult> {
  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) throw new Error('Email already registered')

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role: 'admin',
    ...(firstName && { firstName }),
    ...(lastName && { lastName }),
  })

  return buildAuthResult(user)
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) throw new Error('Invalid credentials')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new Error('Invalid credentials')

  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() })

  return buildAuthResult(user)
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  let payload: { userId: string; email: string; role: string }
  try {
    payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as typeof payload
  } catch {
    throw new Error('Invalid refresh token')
  }

  const user = await User.findById(payload.userId)
  if (!user) throw new Error('User not found')

  return { accessToken: signAccessToken(user) }
}

function buildAuthResult(user: IUser): AuthResult {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    user: { id: user._id.toString(), email: user.email, role: user.role },
  }
}

function signAccessToken(user: IUser): string {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '15m' },
  )
}

function signRefreshToken(user: IUser): string {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, role: user.role },
    config.jwtRefreshSecret,
    { expiresIn: '7d' },
  )
}
