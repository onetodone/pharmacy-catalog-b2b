import './utils/throttle-env' // must precede any import that loads AppModule
import request from 'supertest'
import { createE2EApp, E2EContext, resetDatabase } from './utils/e2e-app'
import { seedWorld } from './utils/fixtures'

// THROTTLE_LIMIT is forced to 3 (see ./utils/throttle-env).
describe('Auth rate limiting (e2e)', () => {
  let ctx: E2EContext

  beforeAll(async () => {
    ctx = await createE2EApp()
    await resetDatabase(ctx.prisma)
    await seedWorld(ctx.prisma)
  })

  afterAll(async () => {
    await ctx.app.close()
  })

  it('429s once the per-IP login limit is exceeded', async () => {
    const attempt = () =>
      request(ctx.server).post('/api/auth/login').send({ login: 'customer1', password: 'wrong-on-purpose' })

    const statuses: number[] = []
    for (let i = 0; i < 5; i++) {
      statuses.push((await attempt()).status)
    }

    expect(statuses.slice(0, 3)).toEqual([401, 401, 401])
    expect(statuses).toContain(429)
  })
})
