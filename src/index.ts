import { env } from "../env.ts";
import app from "./server.ts";
import { pool } from "./db/connection.ts";
import { closeRedisClient } from "./db/redis.ts";
import type { Server } from "http";

const server: Server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
  console.log(`Environment: ${env.APP_STAGE}`);
});

// /**
//  * Graceful shutdown handler
//  * Properly closes all connections before exiting
//  */
// async function gracefulShutdown(signal: string): Promise<void> {
//   console.log(`\n${signal} received. Starting graceful shutdown...`)

//   // Stop accepting new connections
//   server.close(async (err) => {
//     if (err) {
//       console.error('Error closing server:', err)
//       process.exit(1)
//     }

//     console.log('HTTP server closed')

//     try {
//       // Close database connection pool
//       console.log('Closing database connection pool...')
//       await pool.end()
//       console.log('Database connection pool closed')

//       // Close Redis connection
//       await closeRedisClient()

//       console.log('Graceful shutdown completed successfully')
//       process.exit(0)
//     } catch (error) {
//       console.error('Error during graceful shutdown:', error)
//       process.exit(1)
//     }
//   })

//   // Force shutdown after 30 seconds if graceful shutdown takes too long
//   setTimeout(() => {
//     console.error('Graceful shutdown timeout exceeded. Forcing shutdown...')
//     process.exit(1)
//   }, 30000)
// }

// // Handle termination signals
// process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
// process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// // Handle uncaught exceptions and unhandled promise rejections
// process.on('uncaughtException', (error) => {
//   console.error('Uncaught Exception:', error)
//   gracefulShutdown('uncaughtException')
// })

// process.on('unhandledRejection', (reason, promise) => {
//   console.error('Unhandled Rejection at:', promise, 'reason:', reason)
//   gracefulShutdown('unhandledRejection')
// })
