const DURATION_PATTERN = /^(\d+)(s|m|h|d)?$/

const SECONDS_PER_UNIT: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
}

export function parseDurationToSeconds(duration: string): number {
  const match = DURATION_PATTERN.exec(duration.trim())
  if (!match) {
    throw new Error(`Unsupported duration format: "${duration}"`)
  }

  const [, amount, unit] = match
  return parseInt(amount, 10) * SECONDS_PER_UNIT[unit ?? 's']
}
