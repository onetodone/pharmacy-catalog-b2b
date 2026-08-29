import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { Role, User } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { AuthService } from './auth.service'
import { encodeSessionToken, generateSessionSecret, hashSessionSecret } from './session-token'

// NestJS 12 is ESM-only, which makes `jest.mock` of CJS deps like bcryptjs
// awkward. bcrypt is fast enough at a handful of calls, so these specs use the
// real implementation with a pre-computed hash instead.
const PASSWORD = 'correctTestPassword'
let passwordHash: string

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 4)
})

function makeUser(over: Partial<User> = {}): User {
  return {
    id: 7,
    login: 'customer1',
    email: 'customer1@pharmacy.test',
    name: 'Downtown Pharmacy',
    passwordHash,
    role: Role.CUSTOMER,
    approved: true,
    banned: false,
    avatar: null,
    phone: null,
    taxId: null,
    managerName: null,
    address: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...over,
  }
}

/** A stored session whose secret is `secret` (so the token round-trips). */
function sessionFixture(secret: string, over: Partial<{ expiresAt: Date; user: User }> = {}) {
  return {
    id: 'sess_abc123',
    userId: 7,
    tokenHash: hashSessionSecret(secret),
    userAgent: null,
    ipAddress: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: makeUser(),
    ...over,
  }
}

describe('AuthService', () => {
  let service: AuthService
  let prisma: {
    user: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock }
    session: {
      create: jest.Mock
      findUnique: jest.Mock
      update: jest.Mock
      delete: jest.Mock
      deleteMany: jest.Mock
    }
  }
  let jwt: { signAsync: jest.Mock }

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      session: {
        create: jest.fn((args: any) => Promise.resolve({ id: 'sess_new', ...args.data })),
        findUnique: jest.fn(),
        update: jest.fn((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
        delete: jest.fn(() => Promise.resolve({})),
        deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
    }
    jwt = { signAsync: jest.fn(() => Promise.resolve('access.jwt.token')) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: (_k: string, fallback?: unknown) => fallback } },
      ],
    }).compile()

    service = module.get(AuthService)
  })

  afterEach(() => jest.clearAllMocks())

  // ─── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('issues a session for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser())

      const result = await service.login(
        { login: 'customer1', password: PASSWORD },
        { ipAddress: '1.2.3.4', userAgent: 'jest' },
      )

      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 7,
            ipAddress: '1.2.3.4',
            userAgent: 'jest',
            tokenHash: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        }),
      )
      expect(result.accessToken).toBe('access.jwt.token')
      expect(result.refreshToken).toMatch(/^sess_new\..+$/)
      expect(result.user).not.toHaveProperty('passwordHash')
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 7, role: Role.CUSTOMER, sid: 'sess_new' }),
      )
    })

    it('rejects an unknown login without creating a session', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      await expect(service.login({ login: 'nobody', password: 'x' })).rejects.toThrow(UnauthorizedException)
      expect(prisma.session.create).not.toHaveBeenCalled()
    })

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser())
      await expect(service.login({ login: 'customer1', password: 'wrong' })).rejects.toThrow(UnauthorizedException)
      expect(prisma.session.create).not.toHaveBeenCalled()
    })

    it('refuses a banned account', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ banned: true }))
      await expect(service.login({ login: 'customer1', password: PASSWORD })).rejects.toThrow(/banned/)
    })

    it('refuses an account still pending approval', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ approved: false }))
      await expect(service.login({ login: 'customer1', password: PASSWORD })).rejects.toThrow(/pending approval/)
    })
  })

  // ─── refresh ─────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('rotates the secret in place, keeping the same session id', async () => {
      const secret = generateSessionSecret()
      prisma.session.findUnique.mockResolvedValue(sessionFixture(secret))

      const result = await service.refresh(encodeSessionToken('sess_abc123', secret), {
        ipAddress: '9.9.9.9',
        userAgent: 'ua-2',
      })

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'sess_abc123' },
        data: {
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
          ipAddress: '9.9.9.9',
          userAgent: 'ua-2',
        },
      })
      // New secret -> new hash.
      const updateArg = prisma.session.update.mock.calls[0][0] as { data: { tokenHash: string } }
      expect(updateArg.data.tokenHash).not.toBe(hashSessionSecret(secret))
      expect(prisma.session.delete).not.toHaveBeenCalled()
      expect(result.refreshToken).toMatch(/^sess_abc123\..+$/)
      expect(result.accessToken).toBe('access.jwt.token')
    })

    it('rejects a malformed token without touching the database', async () => {
      await expect(service.refresh('not-a-token')).rejects.toThrow(UnauthorizedException)
      expect(prisma.session.findUnique).not.toHaveBeenCalled()
    })

    it('rejects when the session row is gone', async () => {
      prisma.session.findUnique.mockResolvedValue(null)
      await expect(service.refresh(encodeSessionToken('sess_abc123', 'whatever'))).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('drops the session when the user is no longer active', async () => {
      const secret = generateSessionSecret()
      prisma.session.findUnique.mockResolvedValue(sessionFixture(secret, { user: makeUser({ banned: true }) }))
      await expect(service.refresh(encodeSessionToken('sess_abc123', secret))).rejects.toThrow(UnauthorizedException)
      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'sess_abc123' } })
    })

    it('drops the session when it has expired', async () => {
      const secret = generateSessionSecret()
      prisma.session.findUnique.mockResolvedValue(sessionFixture(secret, { expiresAt: new Date(Date.now() - 1000) }))
      await expect(service.refresh(encodeSessionToken('sess_abc123', secret))).rejects.toThrow(UnauthorizedException)
      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'sess_abc123' } })
    })

    it('does NOT drop or rotate the session when only the secret is wrong', async () => {
      const secret = generateSessionSecret()
      prisma.session.findUnique.mockResolvedValue(sessionFixture(secret))
      await expect(service.refresh(encodeSessionToken('sess_abc123', generateSessionSecret()))).rejects.toThrow(
        UnauthorizedException,
      )
      expect(prisma.session.delete).not.toHaveBeenCalled()
      expect(prisma.session.update).not.toHaveBeenCalled()
    })
  })

  // ─── logout / register / me ──────────────────────────────────────────────────

  describe('logout', () => {
    it('deletes the session by id', async () => {
      await service.logout('sess_abc123')
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { id: 'sess_abc123' } })
    })
  })

  describe('register', () => {
    const dto = {
      login: 'newco',
      password: 'password12',
      name: 'New Co',
      managerName: 'Manager',
      email: 'new@co.test',
      phone: '+1 555 000',
      taxId: 'TAX-1',
      address: '1 Road, Town',
    }

    it('creates a pending CUSTOMER account with a hashed password', async () => {
      prisma.user.findFirst.mockResolvedValue(null)
      prisma.user.create.mockImplementation((args: any) => Promise.resolve(makeUser(args.data)))

      const result = await service.register(dto)

      const createArg = prisma.user.create.mock.calls[0][0] as { data: Record<string, unknown> }
      expect(createArg.data).toMatchObject({ role: Role.CUSTOMER, approved: false })
      expect(createArg.data.passwordHash).toMatch(BCRYPT_HASH)
      expect(createArg.data.passwordHash).not.toBe(dto.password)
      expect(result.user).not.toHaveProperty('passwordHash')
      expect(result.message).toMatch(/approve/i)
    })

    it('rejects a duplicate login or email', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser())
      await expect(service.register(dto)).rejects.toThrow(BadRequestException)
      expect(prisma.user.create).not.toHaveBeenCalled()
    })
  })

  describe('me', () => {
    it('returns the user without the password hash', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser())
      const me = await service.me(7)
      expect(me).not.toHaveProperty('passwordHash')
      expect(me.id).toBe(7)
    })

    it('throws when the user disappeared', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      await expect(service.me(999)).rejects.toThrow(UnauthorizedException)
    })
  })
})
