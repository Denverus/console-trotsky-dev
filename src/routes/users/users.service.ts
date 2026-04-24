import { User, IUser } from '../../models/user.model'

export async function listUsers(): Promise<IUser[]> {
  return User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 })
}
