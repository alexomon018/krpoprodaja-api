import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // Unit tests don't need database setup
    setupFiles: ['./tests/setup/unitTestSetup.ts'],
    // Set environment before tests run
    env: {
      APP_STAGE: 'test',
      NODE_ENV: 'test',
    },
    // Automatically clean up after each test to ensure isolation
    clearMocks: true,
    restoreMocks: true,
    // Unit tests can run in parallel since they don't touch the database
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  },
  plugins: [],
})
