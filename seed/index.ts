import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { config } from '../src/config'
import { User } from '../src/models/user.model'

async function seed() {
  const { superAdminEmail: email, superAdminPassword: password } = config

  if (!email || !password) {
    console.error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env')
    process.exit(1)
  }

  await mongoose.connect(config.mongoUri)
  console.log('MongoDB connected')

  const existing = await User.findOne({ email })
  if (existing) {
    console.log(`SuperAdmin ${email} already exists — nothing to do`)
    await mongoose.disconnect()
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({ email, passwordHash, role: 'superadmin' })
  console.log(`SuperAdmin ${email} created`)

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
