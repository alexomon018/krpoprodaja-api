/**
 * Unit Test Setup
 *
 * This file runs before each test file and sets up the test environment.
 * It ensures that environment variables are loaded before any modules are imported.
 */

// Set environment to test BEFORE any imports
process.env.APP_STAGE = 'test'
process.env.NODE_ENV = 'test'

// Import vitest for mocking
import { vi } from 'vitest'

// Mock console to reduce noise in test output (optional)
// You can comment these out if you want to see logs during testing
const originalConsoleLog = console.log
const originalConsoleError = console.error

console.log = vi.fn((...args: any[]) => {
  // Only show logs that don't match common patterns we want to suppress
  const message = args[0]?.toString() || ''
  if (
    !message.includes('JWT Revocation') &&
    !message.includes('Password reset') &&
    !message.includes('Revoked all tokens')
  ) {
    originalConsoleLog(...args)
  }
})

console.error = vi.fn((...args: any[]) => {
  // Show all errors (you might want to filter these too)
  const message = args[0]?.toString() || ''
  if (
    !message.includes('Registration error') &&
    !message.includes('Login error')
  ) {
    originalConsoleError(...args)
  }
})
