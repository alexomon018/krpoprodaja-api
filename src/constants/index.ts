/**
 * Application-wide constants
 * Centralizes magic numbers and commonly used values
 */

// ============================================================================
// Time Constants (in milliseconds)
// ============================================================================

export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  REQUEST_TIMEOUT: 408,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// ============================================================================
// Rate Limiting Constants
// ============================================================================

export const RATE_LIMIT = {
  AUTH: {
    WINDOW_MS: 15 * TIME.MINUTE,
    MAX_REQUESTS: 15,
  },
  REFRESH_TOKEN: {
    WINDOW_MS: 15 * TIME.MINUTE,
    MAX_REQUESTS: 10,
  },
  PASSWORD_RESET_REQUEST: {
    WINDOW_MS: TIME.HOUR,
    MAX_REQUESTS: 3,
  },
  PASSWORD_RESET_COMPLETE: {
    WINDOW_MS: 15 * TIME.MINUTE,
    MAX_REQUESTS: 5,
  },
  PHONE_VERIFICATION: {
    WINDOW_MS: TIME.HOUR,
    MAX_REQUESTS: 15,
  },
  CSRF_TOKEN: {
    WINDOW_MS: 15 * TIME.MINUTE,
    MAX_REQUESTS: 30,
  },
  API_GENERAL: {
    WINDOW_MS: 15 * TIME.MINUTE,
    MAX_REQUESTS: 100,
  },
} as const;

// ============================================================================
// CSRF Constants
// ============================================================================

export const CSRF = {
  COOKIE_NAME: "csrf-token",
  HEADER_NAME: "x-csrf-token",
  TOKEN_MAX_AGE: 24 * TIME.HOUR,
} as const;

// ============================================================================
// Health Check Thresholds
// ============================================================================

export const HEALTH_CHECK = {
  DATABASE_SLOW_THRESHOLD_MS: 1000,
  REDIS_SLOW_THRESHOLD_MS: 500,
} as const;

// ============================================================================
// Graceful Shutdown Constants
// ============================================================================

export const SHUTDOWN = {
  TIMEOUT_MS: 30 * TIME.SECOND,
} as const;

// ============================================================================
// S3 / Image Upload Constants
// ============================================================================

export const IMAGE = {
  PRESIGNED_URL_EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 7 days
  CACHE_CONTROL_MAX_AGE: 31536000, // 1 year in seconds
} as const;

// ============================================================================
// Redis Constants
// ============================================================================

export const REDIS = {
  CONNECT_TIMEOUT_MS: 10 * TIME.SECOND,
  RECONNECT_MAX_DELAY_MS: 3 * TIME.SECOND,
  RECONNECT_BASE_DELAY_MS: 50,
} as const;

// ============================================================================
// Database Connection Pool Constants
// ============================================================================

export const DB_POOL = {
  MAX_USES: 7500, // Close and replace connections after 7500 uses
} as const;

// ============================================================================
// JWT Revocation / Token Tracking Constants
// ============================================================================

export const TOKEN_TRACKING = {
  CLEANUP_INTERVAL_MS: TIME.HOUR,
  OAUTH_CLEANUP_INTERVAL_MS: 5 * TIME.MINUTE,
} as const;

// ============================================================================
// Validation Constants
// ============================================================================

export const VALIDATION = {
  BIO_MAX_LENGTH: 500,
  REVIEW_COMMENT_MIN_LENGTH: 10,
  REVIEW_COMMENT_MAX_LENGTH: 1000,
} as const;

// ============================================================================
// Pagination Constants
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
