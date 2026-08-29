const preset = require('./jest.preset.js')

// Unit tests: fast, no I/O. Specs sit next to the code they cover
// (src/<area>/<name>.spec.ts) and mock PrismaService. Database-backed suites
// are the Supertest e2e tests under test/ (see test/jest-e2e.js).
/** @type {import('jest').Config} */
module.exports = {
  ...preset,
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!main.ts', '!setup-app.ts'],
  coverageDirectory: '../coverage',
}
