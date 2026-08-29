const preset = require('../jest.preset.js')

// Supertest e2e: boots the whole Nest app against a throwaway Postgres database
// (see .env.test / test/setup-e2e.ts). Runs serially — the suites share one DB.
/** @type {import('jest').Config} */
module.exports = {
  ...preset,
  rootDir: '..',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  globalSetup: '<rootDir>/test/global-setup.ts',
  setupFiles: ['<rootDir>/test/setup-e2e.ts'],
  maxWorkers: 1,
}
