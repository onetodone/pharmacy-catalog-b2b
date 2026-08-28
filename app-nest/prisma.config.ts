import * as dotenv from 'dotenv'
import { defineConfig } from '@prisma/config'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
})
