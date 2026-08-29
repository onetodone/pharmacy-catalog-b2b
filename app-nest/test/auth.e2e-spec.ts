import request from 'supertest'
import { createE2EApp, E2EContext, resetDatabase } from './utils/e2e-app'
import { seedWorld, TEST_PASSWORD } from './utils/fixtures'

const REFRESH_COOKIE = /(^|;|\s)refreshToken=/

function refreshCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = raw?.find((c) => c.startsWith('refreshToken='))
  if (!cookie) throw new Error('no refreshToken cookie on response')
  return cookie.split(';')[0]
}

describe('Auth (e2e)', () => {
  let ctx: E2EContext

  beforeAll(async () => {
    ctx = await createE2EApp()
  })

  afterAll(async () => {
    await ctx.app.close()
  })

  beforeEach(async () => {
    await resetDatabase(ctx.prisma)
    await seedWorld(ctx.prisma)
  })

  // ─── register ────────────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    const dto = {
      login: 'newpharma',
      password: 'password123',
      name: 'New Pharma LLC',
      managerName: 'Dana Manager',
      email: 'new@pharma.test',
      phone: '+1 555 12 34',
      taxId: 'TAX-9001',
      address: '5 Commerce Way, Trade City',
    }

    it('creates an unapproved account that cannot log in yet', async () => {
      const res = await request(ctx.server).post('/api/auth/register').send(dto).expect(201)
      expect(res.body.message).toMatch(/approve/i)
      expect(res.body.user).toMatchObject({ login: 'newpharma', approved: false })
      expect(res.body.user).not.toHaveProperty('passwordHash')

      await request(ctx.server).post('/api/auth/login').send({ login: dto.login, password: dto.password }).expect(403)
    })

    it('rejects a duplicate login', async () => {
      await request(ctx.server)
        .post('/api/auth/register')
        .send({ ...dto, login: 'customer1' })
        .expect(400)
    })

    it('rejects a malformed payload (422-style validation → 400)', async () => {
      await request(ctx.server)
        .post('/api/auth/register')
        .send({ ...dto, password: 'short' })
        .expect(400)
    })
  })

  // ─── login ───────────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('returns an access token + httpOnly refresh cookie', async () => {
      const res = await request(ctx.server)
        .post('/api/auth/login')
        .send({ login: 'customer1', password: TEST_PASSWORD })
        .expect(200)

      expect(typeof res.body.accessToken).toBe('string')
      expect(res.body.user).not.toHaveProperty('passwordHash')

      const cookies = res.headers['set-cookie'] as unknown as string[]
      const cookie = cookies.find((c) => REFRESH_COOKIE.test(c))!
      expect(cookie).toMatch(/HttpOnly/i)
      expect(cookie).toMatch(/Path=\/api\/auth/i)
    })

    it('rejects a wrong password with 401', async () => {
      await request(ctx.server).post('/api/auth/login').send({ login: 'customer1', password: 'nope' }).expect(401)
    })

    it('rejects a banned account with 403', async () => {
      await request(ctx.server)
        .post('/api/auth/login')
        .send({ login: 'customer3', password: TEST_PASSWORD })
        .expect(403)
    })

    it('rejects an unapproved account with 403', async () => {
      await request(ctx.server)
        .post('/api/auth/login')
        .send({ login: 'customer2', password: TEST_PASSWORD })
        .expect(403)
    })
  })

  // ─── me / refresh / logout ───────────────────────────────────────────────────

  describe('session lifecycle', () => {
    async function login(loginName = 'customer1') {
      const res = await request(ctx.server)
        .post('/api/auth/login')
        .send({ login: loginName, password: TEST_PASSWORD })
        .expect(200)
      return { accessToken: res.body.accessToken as string, cookie: refreshCookie(res) }
    }

    it('GET /api/auth/me needs a valid bearer token', async () => {
      await request(ctx.server).get('/api/auth/me').expect(401)

      const { accessToken } = await login()
      const res = await request(ctx.server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
      expect(res.body).toMatchObject({ login: 'customer1', role: 'CUSTOMER' })
    })

    it('POST /api/auth/refresh rotates the token and invalidates the old cookie', async () => {
      const { cookie } = await login()

      const refreshed = await request(ctx.server).post('/api/auth/refresh').set('Cookie', cookie).expect(200)
      expect(typeof refreshed.body.accessToken).toBe('string')
      const rotated = refreshCookie(refreshed)
      expect(rotated).not.toBe(cookie)

      // The superseded cookie (same session id, old secret) is now rejected.
      await request(ctx.server).post('/api/auth/refresh').set('Cookie', cookie).expect(401)
      // The rotated cookie still works.
      await request(ctx.server).post('/api/auth/refresh').set('Cookie', rotated).expect(200)
    })

    it('POST /api/auth/logout kills outstanding access tokens immediately', async () => {
      const { accessToken, cookie } = await login()

      await request(ctx.server).post('/api/auth/logout').set('Authorization', `Bearer ${accessToken}`).expect(200)

      // Session row is gone -> the still-unexpired access token no longer works.
      await request(ctx.server).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(401)
      await request(ctx.server).post('/api/auth/refresh').set('Cookie', cookie).expect(401)
    })

    it('lists the caller’s own sessions', async () => {
      const { accessToken } = await login()
      const res = await request(ctx.server)
        .get('/api/users/me/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body).toHaveLength(1)
      expect(res.body[0]).toMatchObject({ isCurrent: true })
    })
  })

  // ─── RBAC smoke ──────────────────────────────────────────────────────────────

  describe('role guards', () => {
    async function tokenFor(loginName: string) {
      const res = await request(ctx.server)
        .post('/api/auth/login')
        .send({ login: loginName, password: TEST_PASSWORD })
        .expect(200)
      return res.body.accessToken as string
    }

    it('blocks a customer from an admin-only route with 403', async () => {
      const token = await tokenFor('customer1')
      await request(ctx.server).get('/api/users').set('Authorization', `Bearer ${token}`).expect(403)
    })

    it('allows an admin through the same route', async () => {
      const token = await tokenFor('admin')
      await request(ctx.server).get('/api/users').set('Authorization', `Bearer ${token}`).expect(200)
    })
  })
})
