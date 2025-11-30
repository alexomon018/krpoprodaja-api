import { db } from "../db/connection.ts";
import { sql } from "drizzle-orm";
import { redisClient } from "../db/redis.ts";

/**
 * Health check status for a dependency
 */
export interface DependencyHealth {
  status: "healthy" | "unhealthy" | "degraded";
  message?: string;
  responseTime?: number;
}

/**
 * Overall health check response
 */
export interface HealthCheckResponse {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  service: string;
  version?: string;
  uptime: number;
  dependencies: {
    database: DependencyHealth;
    redis: DependencyHealth;
  };
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<DependencyHealth> {
  const startTime = Date.now();
  try {
    // Simple query to check database connectivity
    await db.execute(sql`SELECT 1`);
    const responseTime = Date.now() - startTime;

    // Warn if database is slow
    if (responseTime > 1000) {
      return {
        status: "degraded",
        message: "Database responding slowly",
        responseTime,
      };
    }

    return {
      status: "healthy",
      message: "Database connection successful",
      responseTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "unhealthy",
      message: `Database connection failed: ${errorMessage}`,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check Redis connectivity and performance
 */
async function checkRedis(): Promise<DependencyHealth> {
  const startTime = Date.now();
  try {
    // Check if Redis client is initialized
    if (!redisClient || !redisClient.isOpen) {
      return {
        status: "unhealthy",
        message: "Redis client not initialized or not connected",
        responseTime: Date.now() - startTime,
      };
    }

    // Ping Redis
    const pong = await redisClient.ping();
    const responseTime = Date.now() - startTime;

    if (pong !== "PONG") {
      return {
        status: "unhealthy",
        message: "Redis ping failed",
        responseTime,
      };
    }

    // Warn if Redis is slow
    if (responseTime > 500) {
      return {
        status: "degraded",
        message: "Redis responding slowly",
        responseTime,
      };
    }

    return {
      status: "healthy",
      message: "Redis connection successful",
      responseTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "unhealthy",
      message: `Redis connection failed: ${errorMessage}`,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheckResponse> {
  const [databaseHealth, redisHealth] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  // Determine overall status
  let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy";

  if (databaseHealth.status === "unhealthy" || redisHealth.status === "unhealthy") {
    overallStatus = "unhealthy";
  } else if (databaseHealth.status === "degraded" || redisHealth.status === "degraded") {
    overallStatus = "degraded";
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: "KrpoProdaja API",
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    dependencies: {
      database: databaseHealth,
      redis: redisHealth,
    },
  };
}

/**
 * Simple liveness check (doesn't check dependencies)
 * Use for Kubernetes liveness probes
 */
export function performLivenessCheck() {
  return {
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}

/**
 * Readiness check (checks if service is ready to accept traffic)
 * Use for Kubernetes readiness probes
 */
export async function performReadinessCheck() {
  const healthCheck = await performHealthCheck();

  // Service is ready only if all dependencies are healthy or degraded (not unhealthy)
  const isReady = healthCheck.status !== "unhealthy";

  return {
    ready: isReady,
    timestamp: new Date().toISOString(),
    dependencies: healthCheck.dependencies,
  };
}
