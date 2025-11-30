import { createClient } from "redis";
import { env } from "../../env.ts";

export type RedisClientType = ReturnType<typeof createClient>;

let redisClient: RedisClientType | null = null;

/**
 * Creates and configures a Redis client instance
 * Uses environment variables for connection configuration
 */
export const createRedisClient = (): RedisClientType => {
  const socketConfig: any = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    connectTimeout: 10000, // 10 seconds
    reconnectStrategy: (retries: number) => {
      // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, max 3s
      const delay = Math.min(50 * Math.pow(2, retries), 3000);
      console.log(`Redis reconnection attempt ${retries + 1}, waiting ${delay}ms`);
      return delay;
    },
  };

  // Only add tls property if enabled
  if (env.REDIS_TLS_ENABLED) {
    socketConfig.tls = true;
  }

  const client = createClient({
    socket: socketConfig,
    password: env.REDIS_PASSWORD || undefined,
    database: env.REDIS_DB,
  });

  // Error handling
  client.on("error", (err) => {
    console.error("Redis Client Error:", err);
  });

  client.on("connect", () => {
    console.log("Redis client connected successfully");
  });

  client.on("reconnecting", () => {
    console.log("Redis client reconnecting...");
  });

  client.on("ready", () => {
    console.log("Redis client ready to accept commands");
  });

  return client;
};

/**
 * Initialize Redis client immediately for synchronous access in health checks
 */
const initRedisClient = async (): Promise<void> => {
  if (!redisClient) {
    redisClient = createRedisClient();
    await redisClient.connect();
  }
};

// Initialize immediately
initRedisClient().catch((err) => {
  console.error("Failed to initialize Redis client:", err);
});

/**
 * Gets or creates a singleton Redis client instance
 * Automatically connects to Redis if not already connected
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
  if (!redisClient) {
    redisClient = createRedisClient();
    await redisClient.connect();
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
};

/**
 * Synchronous access to Redis client (may be null if not initialized)
 * Use this for health checks and shutdown handlers
 */
export { redisClient };

/**
 * Closes the Redis client connection
 * Should be called during graceful shutdown
 */
export const closeRedisClient = async (): Promise<void> => {
  if (redisClient && redisClient.isOpen) {
    console.log("Closing Redis connection...");
    await redisClient.quit();
    redisClient = null;
    console.log("Redis connection closed");
  }
};

/**
 * Checks if Redis is healthy and responsive
 * Used by health check endpoint
 */
export const checkRedisHealth = async (): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> => {
  try {
    const start = Date.now();
    const client = await getRedisClient();

    // Ping Redis to check connectivity
    const response = await client.ping();
    const latency = Date.now() - start;

    if (response === "PONG") {
      return { healthy: true, latency };
    }

    return { healthy: false, error: "Unexpected ping response" };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Helper function to set a value in Redis with optional TTL
 */
export const setWithExpiry = async (
  key: string,
  value: string,
  expirySeconds?: number
): Promise<void> => {
  const client = await getRedisClient();

  if (expirySeconds) {
    await client.setEx(key, expirySeconds, value);
  } else {
    await client.set(key, value);
  }
};

/**
 * Helper function to get a value from Redis
 */
export const get = async (key: string): Promise<string | null> => {
  const client = await getRedisClient();
  const value = await client.get(key);
  return value ? String(value) : null;
};

/**
 * Helper function to delete a key from Redis
 */
export const del = async (key: string): Promise<void> => {
  const client = await getRedisClient();
  await client.del(key);
};

/**
 * Helper function to check if a key exists in Redis
 */
export const exists = async (key: string): Promise<boolean> => {
  const client = await getRedisClient();
  const result = await client.exists(key);
  return result === 1;
};

/**
 * Helper function to set TTL on existing key
 */
export const expire = async (key: string, seconds: number): Promise<void> => {
  const client = await getRedisClient();
  await client.expire(key, seconds);
};

/**
 * Helper function to get keys matching a pattern
 */
export const keys = async (pattern: string): Promise<string[]> => {
  const client = await getRedisClient();
  const result = await client.keys(pattern);
  return result.map(k => String(k));
};
