import mongoose from 'mongoose'
import { config } from '../config'
import { ApiKey } from '../models/api-key.model'

const DEFAULT_NAME = 'Default'

async function run() {
  await mongoose.connect(config.mongoUri)
  console.log('MongoDB connected')

  const result = await ApiKey.collection.updateMany(
    { $or: [{ name: { $exists: false } }, { name: null }, { name: '' }] },
    { $set: { name: DEFAULT_NAME } },
  )
  console.log(`Backfilled name="${DEFAULT_NAME}" on ${result.modifiedCount} key(s)`)

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
