import bcrypt from 'bcryptjs'
import { User, IUser } from '../../models/user.model'

export async function listUsers(): Promise<IUser[]> {
  return User.find({}, { passwordHash: 0 }).populate('companyId', 'name slug').sort({ createdAt: -1 })
}

export async function getUserById(id: string): Promise<IUser> {
  const user = await User.findById(id, { passwordHash: 0 }).populate('companyId', 'name slug')
  if (!user) throw new Error('User not found')
  return user
}

export async function updateUserProfile(
  id: string,
  fields: { firstName?: string; lastName?: string },
): Promise<void> {
  await User.findByIdAndUpdate(id, fields)
}

export async function setPassword(id: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await User.findByIdAndUpdate(id, { passwordHash })
}

export async function verifyAndChangePassword(
  id: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findById(id)
  if (!user) throw new Error('User not found')
  const valid = await bcrypt.compare(oldPassword, user.passwordHash)
  if (!valid) throw new Error('Current password is incorrect')
  const passwordHash = await bcrypt.hash(newPassword, 12)
  user.passwordHash = passwordHash
  await user.save()
}
