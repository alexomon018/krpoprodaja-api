import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // Only use global setup for integration tests, not unit tests
    globalSetup: ['./tests/setup/globalSetup.ts'],
    setupFiles: ['./tests/setup/unitTestSetup.ts'],
    // Only run integration tests (exclude unit tests)
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/unit/**/*.test.ts', 'node_modules/**'],
    // Set environment before tests run
    env: {
      APP_STAGE: 'test',
      NODE_ENV: 'test',
    },
    // Automatically clean up after each test to ensure isolation
    clearMocks: true,
    restoreMocks: true,
    // Ensure tests run sequentially to avoid database conflicts
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
  plugins: [],
})
