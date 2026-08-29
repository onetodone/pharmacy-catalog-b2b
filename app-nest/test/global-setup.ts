import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

const root = path.resolve(__dirname, '..')

/**
 * Runs once before the whole e2e suite: migrate the throwaway test database to
 * head. DATABASE_URL comes from the environment (CI) or `.env.test` (local) —
 * the same precedence as `test/setup-e2e.ts`.
 */
export default function globalSetup(): void {
  const envTest = path.join(root, '.env.test')
  const fromFile = fs.existsSync(envTest) ? dotenv.parse(fs.readFileSync(envTest)) : {}
  const databaseUrl = process.env.DATABASE_URL ?? fromFile.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('e2e: no DATABASE_URL (set it in the environment or app-nest/.env.test)')
  }
  // Guard rail: these suites TRUNCATE every table between tests.
  if (!/test/i.test(databaseUrl)) {
    throw new Error(`e2e: refusing to run against a database not named "*test*": ${databaseUrl}`)
  }

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  })
}
