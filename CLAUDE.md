# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KrpoProdaja API is a Serbian fashion resale marketplace backend built with Express.js, TypeScript, Drizzle ORM, and PostgreSQL. It serves a Next.js frontend with features for product listings, authentication, messaging, and transactions.

A **fast, modern marketplace exclusively for buying and selling second-hand fashion** (clothes, shoes, bags) in Serbia - like Vinted meets KupujemProdajem, but built specifically for Serbian users with superior UX.

---

## 📱 WHAT IS IT?

### **The Product**

A web-based marketplace where Serbian users can:

- **List** their used clothing items in under 2 minutes
- **Browse** thousands of second-hand fashion items
- **Message** sellers directly
- **Buy** items (pay each other directly - cash/bank transfer/courier)
- **Leave reviews** to build trust

## Development Commands

### Running the Application

```bash
npm run dev         # Development mode with auto-reload (tsx watch)
npm start           # Production mode
```

### Database Operations

```bash
npm run db:generate # Generate migration files from schema changes
npm run db:push     # Push schema changes directly to DB (development)
npm run db:migrate  # Run pending migrations (production)
npm run db:studio   # Open Drizzle Studio (database GUI)
npm run db:seed     # Seed the database with initial data
```

### Testing

```bash
npm test                        # Run unit tests only (default)
npm run test:unit               # Run unit tests
npm run test:unit:watch         # Run unit tests in watch mode
npm run test:integration        # Run integration tests (requires DB)
npm run test:integration:watch  # Run integration tests in watch mode
npm run test:all                # Run both unit and integration tests
npm run test:coverage           # Generate coverage report
```

## What NOT to do

- Don't build for imaginary future requirements.
- Don't add complex error handling for edge cases that probably won't happen.
- Don't suggest design patterns unless the problem actually requires them.
- Don't optimize prematurely.
- Don't add configuration for things that rarely change.

---

**Very Important** Always run the following commands before making a commit:

- `yarn run lint:fix`
- `yarn run format`
- `yarn run tsc`

---

## Red Alert Rules (Break = Block)

1. **Zero-Duplication Doctrine**: If a utility exists, _use or extend it_. Re-implementing behavior is technical vandalism.

2. **Mandatory Repo Crawl Before Typing**: Ripgrep the codebase first. If you reinvent an existing function, we'll pin it in a shame-PR.

3. **Scope-Laser Mode**: Edit _only_ files required for the ticket. Touching >2 unrelated modules? Stop. Ping a human. If the change feels "large" (≥200 LOC _or_ ≥5 files), flag **Need-Human-Approval** and wait. No "while I'm here" drive-bys.

4. **One Purpose / One Function**: "And also..." means split it.

5. **Atomic Commits**: One logical change per commit. Unrelated edits = reject.

6. **DRY or Die Tryin'**: 2 copies = warning. 3 copies = felony. CI will fail on detectable duplication.

7. **Expand, Don't Explode**: Extend existing utilities; never fork a `v2` copy-paste tree.

8. **Simplicity Tax**: If reviewers need >30s to grok a diff, refactor until they don't.

9. **Comment Quota Enforcement**: If code needs a paragraph to explain, the code is wrong. Fix the code, then re-evaluate comments.

10. **Kill Dead Code**: Remove unused paths / flags / TODO fossils.

11. **Performance Is a Feature**: New/changed code must meet _or beat_ existing util perf. Slower? Justify with numbers or expect revert.

12. **Linter = Law**: A red ESLint line is a hard stop. Fix or explain. No merges on lint errors.

13. **Context > Cleverness**: Readable beats wizardry. Explain to a sleepy intern in <60s.

14. **Fail Fast, Loud, Early**: Assert aggressively. Silent failures are sabotage.

15. **Docs or It Didn't Ship**: Public utilities need JSDoc/TSDoc. Private helpers: inline types are fine but must be clear.

## Dependency and Constant Management

- If a constant is only used by one file, always prefer dependency injection with a default value instead of relying on the constant being available in closure scope. We can always use it as the default value for that argument.

---

**Important**: Unit tests run in parallel without database setup. Integration tests run sequentially with global database setup. Test configs are split into `vitest.unit.config.ts` and `vitest.config.ts`.

## Architecture and Patterns

### Environment Configuration

Environment variables are validated at startup using Zod schemas in [env.ts](env.ts). The app uses `custom-env` package to load environment-specific `.env` files (`.env.dev`, `.env.test`, `.env.production`). The `APP_STAGE` environment variable determines which file to load (`dev`, `test`, `production`).

**Required Environment Variables**:

- Database: `DATABASE_URL`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`, `DATABASE_IDLE_TIMEOUT_MS`, `DATABASE_CONNECTION_TIMEOUT_MS`
- Redis (REQUIRED): `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional), `REDIS_DB`, `REDIS_TLS_ENABLED`
- JWT: `JWT_SECRET` (min 32 chars), `ACCESS_TOKEN_EXPIRES_IN`, `ID_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_SECRET` (optional), `REFRESH_TOKEN_EXPIRES_IN`
- Security: `BCRYPT_ROUNDS`, `FAILED_LOGIN_ATTEMPTS_LIMIT`, `ACCOUNT_LOCKOUT_DURATION`, `OAUTH_TOKEN_TRACKING_DURATION`
- AWS: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (for S3 and SNS)
- S3: `S3_BUCKET_NAME`, `MAX_IMAGE_SIZE`, `ALLOWED_IMAGE_TYPES`
- Server: `PORT`, `HOST`, `REQUEST_TIMEOUT_MS`
- CORS: `CORS_ORIGIN`

Helper functions for environment checks:

- `isProd()` - Check if NODE_ENV is production
- `isDev()` - Check if NODE_ENV is development
- `isTestEnv()` - Check if NODE_ENV is test

### Redis Integration

**IMPORTANT**: Redis is now a required dependency for production deployments.

Redis is used for:
- JWT token revocation (replacing in-memory manager)
- OAuth token tracking to prevent replay attacks
- Session management
- Rate limiting (future enhancement)
- Caching (future enhancement)

**Setup**:
1. Install Redis locally: `brew install redis` (macOS) or use Docker
2. Start Redis: `redis-server` or `docker-compose up -d redis`
3. Configure environment variables (see above)
4. The app automatically connects to Redis on startup

**Docker Compose Setup**:
A `docker-compose.yml` file is provided for local development with Redis.

**Connection Management**:
- Redis client initializes automatically on app startup
- Graceful shutdown properly closes Redis connection
- Health checks monitor Redis connectivity and performance

### Authentication System

The API implements a **three-token system** using the `jose` library (not `jsonwebtoken`):

1. **Access Token** (`type: 'access'`) - Short-lived (30m), minimal payload for API authorization. Contains only `id`, `type`, and `activated` (email verified status).
2. **ID Token** (`type: 'id'`) - Short-lived (30m), contains user identity data (id, email, firstName, lastName). Used by client to display user info.
3. **Refresh Token** (`type: 'refresh'`) - Long-lived (30d), used to obtain new access/ID tokens.

**Key Points**:

- All tokens have a `type` field that must be verified
- Access tokens use `audience: 'api'`, ID tokens use `audience: 'client'`, refresh tokens use `audience: 'refresh'`
- Tokens can be revoked via the in-memory `jwtRevocationManager` (suitable for single-server deployments)
- For multi-server production, consider using Redis for token revocation

**Middleware**:

- `authenticateToken` - Requires valid access token and checks revocation
- `optionalAuth` - Attaches user if token present, continues if not
- `requireVerifiedEmail` - Ensures user has verified email (checks `activated` claim in JWT, no DB query)

**OAuth Support**:

- Google OAuth and Facebook OAuth are supported
- OAuth tokens are tracked to prevent reuse attacks using `oauthTokenTracking.ts`
- Users can have multiple auth providers linked via the `linkedProviders` field

### Database Schema

Drizzle ORM is used with PostgreSQL. The schema is defined in [src/db/schema.ts](src/db/schema.ts).

**Key Tables**:

- `users` - User accounts with OAuth support (googleId, facebookId, linkedProviders)
- `products` - Product listings with extensive filtering indexes
- `categories` - Product categories
- `brands` - Brand names
- `favorites` - User favorites (unique composite index on userId + productId)
- `reviews` - Product reviews (schema ready, controllers not implemented)
- `conversations` / `conversationParticipants` / `messages` - Messaging system (schema ready, controllers not implemented)

**Important Indexes**:

- Products table has composite indexes for common queries: `(status, createdAt)`, `(status, categoryId, createdAt)`
- Foreign key columns have indexes for efficient joins
- Filter columns (price, size, condition, brand, location) are indexed

**Validation**:

- Zod schemas are auto-generated from Drizzle schema using `drizzle-zod`
- Custom refinements added for email format, phone numbers (E.164), etc.

### Request Flow

```
Request → Middleware Chain → Controller → Response
          ↓
     - helmet (security headers)
     - cors
     - express.json/urlencoded
     - cookieParser
     - requestTimeoutMiddleware (prevents hanging connections)
     - csrfTokenMiddleware (attaches CSRF token to req)
     - morgan (logging, skipped in test env)
     - Route-specific middleware (auth, validation, rate limiting)
```

### Health Checks and Monitoring

The API provides comprehensive health check endpoints for monitoring and orchestration:

- `GET /health` - Full health check with dependency status (database, Redis)
  - Returns 200 for healthy/degraded, 503 for unhealthy
  - Includes performance metrics (response times)
- `GET /health/liveness` - Liveness probe (for Kubernetes)
  - Always returns 200 if process is running
  - Doesn't check dependencies
- `GET /health/readiness` - Readiness probe (for Kubernetes)
  - Returns 200 if ready to accept traffic (dependencies healthy/degraded)
  - Returns 503 if any dependency is unhealthy

**Performance Thresholds**:
- Database queries > 1000ms trigger degraded status
- Redis operations > 500ms trigger degraded status

### Graceful Shutdown

The application implements proper graceful shutdown handling:

1. Listens for SIGTERM, SIGINT, uncaughtException, and unhandledRejection
2. Stops accepting new connections
3. Closes HTTP server
4. Closes database connection pool
5. Closes Redis connection
6. Exits with appropriate code

**Timeout**: If graceful shutdown takes longer than 30 seconds, the process is forcefully terminated.

### Request Timeout Handling

All requests have a configurable timeout (default: 30 seconds) to prevent hanging connections:
- Request timeout returns 408 (Request Timeout)
- Response timeout returns 504 (Gateway Timeout)
- Configured via `REQUEST_TIMEOUT_MS` environment variable

### Controllers and Routes

Controllers follow a consistent pattern:

- Located in [src/controllers/](src/controllers/)
- Routes defined in [src/routes/](src/routes/)
- Use `AuthenticatedRequest` type to access `req.user`
- Validation middleware uses Zod schemas from schema.ts

**Implemented Features**:

- Authentication (register, login, logout, email verification, password reset, OAuth)
- User management (profile CRUD, public profiles)
- Products (CRUD, filtering, pagination, similar products)
- Favorites (add, remove, check, list)
- Categories (list)
- Brands (list)
- Search (full-text search with suggestions)
- Image upload (S3 with Sharp processing)
- Cities (fetched from external Geonames API, cached)

**Schema-Ready but Not Implemented**:

- Reviews and ratings
- Messaging and conversations
- Offers and negotiations

### Security Features

1. **CSRF Protection**: Custom implementation in [src/middleware/csrf.ts](src/middleware/csrf.ts) (csurf package is deprecated). Tokens stored in httpOnly cookies, validated via header or body on state-changing requests.

2. **Rate Limiting**: Implemented in [src/middleware/rateLimiting.ts](src/middleware/rateLimiting.ts) using `express-rate-limit`.

3. **Account Lockout**: Failed login attempts tracked in DB. After 5 failed attempts (configurable via `FAILED_LOGIN_ATTEMPTS_LIMIT`), account locked for 15 minutes (configurable via `ACCOUNT_LOCKOUT_DURATION`).

4. **Password Security**: bcrypt with 12 rounds (configurable via `BCRYPT_ROUNDS`).

5. **OAuth Token Tracking**: Prevents reuse of OAuth tokens within 10 minutes (configurable via `OAUTH_TOKEN_TRACKING_DURATION`).

### Image Upload and Processing

Images are uploaded to AWS S3 and processed with Sharp:

- Located in [src/services/s3Service.ts](src/services/s3Service.ts) and [src/utils/imageProcessor.ts](src/utils/imageProcessor.ts)
- Automatic resizing (max 1920x1920)
- Format conversion to WebP by default (configurable)
- Quality optimization (85% by default)
- Presigned URLs for private bucket access (7-day expiration)
- Multiple image upload support
- Image deletion helpers

**Environment Variables** (validated in env.ts):

- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (required for S3)
- `S3_BUCKET_NAME` (default: krpoprodaja-images)
- `MAX_IMAGE_SIZE` (default: 5242880 bytes = 5MB)
- `ALLOWED_IMAGE_TYPES` (default: image/jpeg,image/png,image/webp)

**Error Handling**:
- Custom error classes: `S3ServiceError` and `ImageValidationError`
- `ImageValidationError` thrown for size/type validation failures
- `S3ServiceError` wraps AWS S3 errors with original error context
- S3 client validates AWS credentials on initialization

### Email and SMS

1. **Email**: Uses Resend API for transactional emails (email verification, password reset). Implementation in [src/utils/email.ts](src/utils/email.ts).

2. **SMS**: Uses AWS SNS for phone verification codes. Implementation in [src/services/snsService.ts](src/services/snsService.ts).

### Error Handling

- Global error handler in [src/server.ts](src/server.ts#L82-L95)
- Custom error handler middleware in [src/middleware/errorHandler.ts](src/middleware/errorHandler.ts)
- Consistent error response format: `{ error: string, details?: any }`
- Validation errors from Zod include field-level details

### Swagger Documentation

Swagger UI is available at `/api-docs` in development. Configuration in [src/swagger.ts](src/swagger.ts).

## Code Style and Conventions

1. **File Extensions**: Use `.ts` extension with explicit imports (e.g., `import foo from './bar.ts'`)

2. **Constants**: All magic numbers and commonly used values are centralized in [src/constants/index.ts](src/constants/index.ts)
   - Use named constants instead of magic numbers
   - Categories: TIME, HTTP_STATUS, RATE_LIMIT, CSRF, HEALTH_CHECK, SHUTDOWN, IMAGE, REDIS, DB_POOL, TOKEN_TRACKING, VALIDATION, PAGINATION
   - Example: Use `TIME.HOUR` instead of `60 * 60 * 1000`

3. **Type Safety**:

   - Use Drizzle-generated types (`User`, `Product`, etc.) from schema.ts
   - Use Zod schemas for validation
   - Extend `AuthenticatedRequest` interface for authenticated routes

3. **Database Queries**:

   - Use Drizzle query builder, not raw SQL
   - Always handle null/undefined from optional relations
   - Use transactions for multi-step operations

4. **Testing**:

   - Unit tests: Mock database, focus on business logic
   - Integration tests: Use real database with global setup/teardown
   - Database helpers in [tests/helpers/dbHelpers.ts](tests/helpers/dbHelpers.ts)

5. **Environment Variables**:
   - All env vars must be defined in [env.ts](env.ts) Zod schema
   - Use `env.VARIABLE_NAME`, not `process.env.VARIABLE_NAME`

## Common Patterns

### Adding a New Authenticated Route

1. Create controller function accepting `AuthenticatedRequest`
2. Add Zod validation schema (or use existing from schema.ts)
3. Create route with `authenticateToken` middleware
4. Optionally add `requireVerifiedEmail` if email verification required
5. Add route to [src/server.ts](src/server.ts)

### Adding a New Database Table

1. Define table in [src/db/schema.ts](src/db/schema.ts) with indexes
2. Add relations if needed
3. Create Zod insert/select schemas using `createInsertSchema`/`createSelectSchema`
4. Generate migration: `npm run db:generate`
5. Apply migration: `npm run db:migrate` (or `npm run db:push` in dev)

### OAuth Integration Pattern

1. User authenticates with OAuth provider
2. Backend verifies OAuth token with provider's API
3. Check if user exists by OAuth ID (googleId/facebookId)
4. If new user, create with OAuth provider info
5. Generate access, ID, and refresh tokens
6. Track OAuth token to prevent reuse

## Deployment Considerations

- Set `NODE_ENV=production` and `APP_STAGE=production`
- Ensure `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are cryptographically secure (min 32 chars)
- Configure `CORS_ORIGIN` to whitelist frontend domains
- Set up database connection pooling (`DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`)
- For multi-server deployments, replace in-memory JWT revocation with Redis
- Configure AWS credentials for S3 and SNS
- Set up Resend API for email delivery
- Enable HTTPS (cookies set to secure in production)
