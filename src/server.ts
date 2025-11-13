import { env, isDev, isTestEnv } from '../env.ts'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/authRoutes.ts'
import userRoutes from './routes/userRoutes.ts'
import productRoutes from './routes/productRoutes.ts'
import favoriteRoutes from './routes/favoriteRoutes.ts'
import categoryRoutes from './routes/categoryRoutes.ts'
import searchRoutes from './routes/searchRoutes.ts'
import morgan from 'morgan'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  morgan('dev', {
    skip: () => isTestEnv(),
  })
)
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'KrpoProdaja API',
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/search', searchRoutes)

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
