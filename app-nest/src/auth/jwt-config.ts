import { ConfigService } from '@nestjs/config'
import type { CookieOptions } from 'express'
import { parseDurationToSeconds } from '../common/duration'

/** Placeholder shipped in `.env.example` — never allowed to reach production. */
export const PLACEHOLDER_JWT_SECRET = 'change-me-to-a-strong-secret-in-production'
const DEV_FALLBACK_SECRET = 'dev-only-change-me-please'

export const REFRESH_TOKEN_COOKIE = 'refreshToken'
export const REFRESH_COOKIE_PATH = '/api/auth'

export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim()
  const isProduction = config.get<string>('NODE_ENV') === 'production'

  if (isProduction) {
    if (!secret || secret === PLACEHOLDER_JWT_SECRET) {
      throw new Error(
        'JWT_SECRET must be set to a strong, unique value in production ' +
          "(generate one with: node -e \"console.log(require('node:crypto').randomBytes(64).toString('hex'))\").",
      )
    }
    return secret
  }

  return secret || DEV_FALLBACK_SECRET
}

export function getAccessTokenTtl(config: ConfigService): string {
  return config.get<string>('JWT_EXPIRES_IN', '15m')
}

export function getRefreshTokenTtl(config: ConfigService): string {
  return config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d')
}

export function refreshCookieOptions(refreshTtl: string): CookieOptions {
  return {
    httpOnly: true,
    // Dev runs over plain http on localhost, where a Secure cookie would be dropped.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: parseDurationToSeconds(refreshTtl) * 1000,
  }
}
