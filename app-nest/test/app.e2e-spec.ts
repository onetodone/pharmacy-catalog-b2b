import request from 'supertest'
import { createE2EApp, E2EContext } from './utils/e2e-app'

describe('App (e2e)', () => {
  let ctx: E2EContext

  beforeAll(async () => {
    ctx = await createE2EApp()
  })

  afterAll(async () => {
    await ctx.app.close()
  })

  it('GET /api/health is public and reports ok', async () => {
    const res = await request(ctx.server).get('/api/health').expect(200)
    expect(res.body.status).toBe('ok')
  })

  it('rejects unknown routes with 404', async () => {
    await request(ctx.server).get('/api/nope').expect(404)
  })

  it('requires auth on a protected route', async () => {
    await request(ctx.server).get('/api/orders').expect(401)
  })
})
