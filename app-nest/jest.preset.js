// Shared Jest transform, used by both jest.config.js (unit) and
// test/jest-e2e.js (Supertest e2e).
//
// Why SWC and not ts-jest: NestJS 12 publishes ESM-only, and @nestjs/throttler
// (still CJS) `require()`s it — Jest's runtime can't bridge that on Node < 24.
// SWC recompiles the @nestjs packages (and specs) down to CommonJS, including
// `import.meta` and dynamic import, so the whole run stays CJS. The @nestjs
// scope is whitelisted out of transformIgnorePatterns for that reason.

const swcTransform = [
  '@swc/jest',
  {
    jsc: {
      target: 'es2022',
      parser: { syntax: 'typescript', decorators: true, dynamicImport: true },
      // Nest DI relies on emitted design:type metadata.
      transform: { legacyDecorator: true, decoratorMetadata: true, useDefineForClassFields: false },
      keepClassNames: true,
    },
    module: { type: 'commonjs' },
    sourceMaps: 'inline',
  },
]

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.m?[tj]sx?$': swcTransform },
  transformIgnorePatterns: ['^(?!.*/@nestjs[/+]).*/node_modules/'],
  testEnvironment: 'node',
}
