import { ConfigService } from '@nestjs/config'
import {
  getAccessTokenTtl,
  getRefreshTokenTtl,
  PLACEHOLDER_JWT_SECRET,
  REFRESH_COOKIE_PATH,
  refreshCookieOptions,
  resolveJwtSecret,
} from './jwt-config'

/** Minimal ConfigService stub backed by a plain map. */
function config(values: Record<string, string | undefined>): ConfigService {
  return {
    get: <T>(key: string, fallback?: T) => (values[key] ?? fallback) as T,
  } as ConfigService
}

describe('resolveJwtSecret', () => {
  describe('production', () => {
    const prod = (secret?: string) => config({ NODE_ENV: 'production', JWT_SECRET: secret })

    it('throws when the secret is missing', () => {
      expect(() => resolveJwtSecret(prod(undefined))).toThrow(/JWT_SECRET must be set/)
    })

    it('throws when the secret is still the .env.example placeholder', () => {
      expect(() => resolveJwtSecret(prod(PLACEHOLDER_JWT_SECRET))).toThrow(/JWT_SECRET must be set/)
    })

    it('returns a real secret', () => {
      expect(resolveJwtSecret(prod('a-genuinely-strong-secret'))).toBe('a-genuinely-strong-secret')
    })

    it('trims the secret before comparing it to the placeholder', () => {
      expect(() => resolveJwtSecret(prod(`  ${PLACEHOLDER_JWT_SECRET}  `))).toThrow(/JWT_SECRET must be set/)
    })
  })

  describe('development', () => {
    it('falls back to a dev-only secret when none is set', () => {
      expect(resolveJwtSecret(config({ NODE_ENV: 'development' }))).toBe('dev-only-change-me-please')
    })

    it('still prefers an explicitly configured secret', () => {
      expect(resolveJwtSecret(config({ JWT_SECRET: 'my-dev-secret' }))).toBe('my-dev-secret')
    })
  })
})

describe('token TTL helpers', () => {
  it('default to 15m access / 30d refresh', () => {
    expect(getAccessTokenTtl(config({}))).toBe('15m')
    expect(getRefreshTokenTtl(config({}))).toBe('30d')
  })

  it('read overrides from config', () => {
    expect(getAccessTokenTtl(config({ JWT_EXPIRES_IN: '5m' }))).toBe('5m')
    expect(getRefreshTokenTtl(config({ JWT_REFRESH_EXPIRES_IN: '7d' }))).toBe('7d')
  })
})

describe('refreshCookieOptions', () => {
  it('is an httpOnly, lax cookie scoped to the auth path', () => {
    const opts = refreshCookieOptions('30d')
    expect(opts).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
    })
  })

  it('derives maxAge (ms) from the refresh TTL', () => {
    expect(refreshCookieOptions('30d').maxAge).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('is not Secure outside production (dev runs over plain http)', () => {
    expect(refreshCookieOptions('30d').secure).toBe(false)
  })
})
