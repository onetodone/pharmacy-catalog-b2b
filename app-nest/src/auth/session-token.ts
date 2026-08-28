import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const SESSION_SECRET_BYTES = 32

export interface ParsedSessionToken {
  sessionId: string
  secret: string
}

export function generateSessionSecret(): string {
  return randomBytes(SESSION_SECRET_BYTES).toString('base64url')
}

export function encodeSessionToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`
}

export function parseSessionToken(raw: string): ParsedSessionToken | null {
  const separatorIndex = raw.indexOf('.')
  if (separatorIndex === -1 || raw.indexOf('.', separatorIndex + 1) !== -1) {
    return null
  }

  const sessionId = raw.slice(0, separatorIndex)
  const secret = raw.slice(separatorIndex + 1)
  if (!sessionId || !secret) {
    return null
  }

  return { sessionId, secret }
}

export function hashSessionSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

export function verifySessionSecret(secret: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashSessionSecret(secret), 'hex')
  const stored = Buffer.from(storedHash, 'hex')
  return candidate.length === stored.length && timingSafeEqual(candidate, stored)
}
