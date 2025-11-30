import { env, isDev, isTestEnv } from '../env.ts'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/authRoutes.ts'
import userRoutes from './routes/userRoutes.ts'
import productRoutes from './routes/productRoutes.ts'
import favoriteRoutes from './routes/favoriteRoutes.ts'
import categoryRoutes from './routes/categoryRoutes.ts'
import brandRoutes from './routes/brandRoutes.ts'
import searchRoutes from './routes/searchRoutes.ts'
import uploadRoutes from './routes/uploadRoutes.ts'
import citiesRoutes from './routes/citiesRoutes.ts'
import morgan from 'morgan'
import { setupSwagger } from './swagger.ts'
import { csrfTokenMiddleware } from './middleware/csrf.ts'
import { csrfTokenLimiter } from './middleware/rateLimiting.ts'
import { requestTimeoutMiddleware } from './middleware/timeout.ts'
import {
  performHealthCheck,
  performLivenessCheck,
  performReadinessCheck,
} from './utils/healthCheck.ts'

const app = express()

app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for Swagger UI
  })
)
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser()) // Parse cookies for refresh tokens and CSRF
app.use(requestTimeoutMiddleware) // Request timeout handling
app.use(csrfTokenMiddleware) // Attach CSRF token to requests
app.use(
  morgan('dev', {
    skip: () => isTestEnv(),
  })
)

// Setup Swagger documentation
setupSwagger(app)

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const healthCheck = await performHealthCheck()

    // Return appropriate status code based on health
    const statusCode =
      healthCheck.status === 'healthy'
        ? 200
        : healthCheck.status === 'degraded'
          ? 200
          : 503

    res.status(statusCode).json(healthCheck)
  } catch (error) {
    console.error('Health check error:', error)
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'KrpoProdaja API',
      error: 'Health check failed',
    })
  }
})

// Liveness probe (doesn't check dependencies)
app.get('/health/liveness', (req, res) => {
  res.status(200).json(performLivenessCheck())
})

// Readiness probe (checks dependencies)
app.get('/health/readiness', async (req, res) => {
  try {
    const readinessCheck = await performReadinessCheck()
    const statusCode = readinessCheck.ready ? 200 : 503
    res.status(statusCode).json(readinessCheck)
  } catch (error) {
    console.error('Readiness check error:', error)
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
    })
  }
})

// CSRF token endpoint with rate limiting
app.get('/api/csrf-token', csrfTokenLimiter, (req, res) => {
  res.json({
    csrfToken: req.csrfToken ? req.csrfToken() : null,
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/brands', brandRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/cities', citiesRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  })
})

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack)
    res.status(500).json({
      error: 'Something went wrong!',
      ...(isDev() && { details: err.message }),
    })
  }
)

export { app }

export default app
