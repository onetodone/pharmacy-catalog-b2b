import { parseDurationToSeconds } from './duration'

describe('parseDurationToSeconds', () => {
  it.each([
    ['30s', 30],
    ['15m', 900],
    ['2h', 7200],
    ['30d', 2_592_000],
  ])('parses %s -> %d seconds', (input, expected) => {
    expect(parseDurationToSeconds(input)).toBe(expected)
  })

  it('treats a bare number as seconds', () => {
    expect(parseDurationToSeconds('45')).toBe(45)
  })

  it('trims surrounding whitespace', () => {
    expect(parseDurationToSeconds('  10m  ')).toBe(600)
  })

  it.each(['', '10x', 'm', '1.5h', '-5m', '10 m'])('rejects %p', (input) => {
    expect(() => parseDurationToSeconds(input)).toThrow(/Unsupported duration format/)
  })
})
