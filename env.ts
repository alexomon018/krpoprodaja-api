import { env as loadEnv } from "custom-env";
import { z } from "zod";

process.env.APP_STAGE = process.env.APP_STAGE || "dev";

const isProduction = process.env.APP_STAGE === "production";
const isDevelopment = process.env.APP_STAGE === "dev";
const isTest = process.env.APP_STAGE === "test";

// Load .env file
if (isDevelopment) {
  loadEnv();
} else if (isTest) {
  loadEnv("test");
}

// Define the schema with environment-specific requirements
const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  APP_STAGE: z.enum(["dev", "production", "test"]).default("dev"),

  // Server
  PORT: z.coerce.number().positive().default(3000),
  HOST: z.string().default("localhost"),
  REQUEST_TIMEOUT_MS: z.coerce.number().positive().default(30000), // 30 seconds default

  // Database
  DATABASE_URL: z.string().startsWith("postgresql://"),
  DATABASE_POOL_MIN: z.coerce.number().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().positive().default(10),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().positive().default(30000),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().positive().default(10000),

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().min(0).max(15).default(0),
  REDIS_TLS_ENABLED: z.coerce.boolean().default(false),

  // JWT & Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("30m"), // Short-lived access tokens
  ID_TOKEN_EXPIRES_IN: z.string().default("30m"), // Short-lived ID tokens
  REFRESH_TOKEN_SECRET: z.string().min(32).optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"), // Long-lived refresh tokens

  // Security - Account Protection
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(20).default(12),
  FAILED_LOGIN_ATTEMPTS_LIMIT: z.coerce.number().min(3).max(10).default(5), // Max failed attempts before lockout
  ACCOUNT_LOCKOUT_DURATION: z.string().default("15m"), // Account lockout duration
  OAUTH_TOKEN_TRACKING_DURATION: z.string().default("10m"), // How long to track used OAuth tokens

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),

  // OAuth - Facebook
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

  // Email - Resend
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default("noreply@example.com"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  PASSWORD_RESET_TOKEN_EXPIRES_IN: z.string().default("1h"),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: z.string().default("24h"),

  // SMS - AWS SNS (legacy)
  AWS_REGION: z.string().default("eu-central-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  PHONE_VERIFICATION_CODE_EXPIRES_IN: z.string().default("10m"),

  // S3 - Image Storage
  S3_BUCKET_NAME: z.string().default("krpoprodaja-images"),
  MAX_IMAGE_SIZE: z.coerce.number().positive().default(5242880), // 5MB default
  ALLOWED_IMAGE_TYPES: z
    .string()
    .default("image/jpeg,image/png,image/webp")
    .transform((val) => val.split(",").map((type) => type.trim())),

  // CORS
  CORS_ORIGIN: z
    .string()
    .or(z.array(z.string()))
    .transform((val) => {
      if (typeof val === "string") {
        return val.split(",").map((origin) => origin.trim());
      }
      return val;
    })
    .default([]),

  // Cities API - Geonames
  GEONAMES_USERNAME: z.string().optional(),

  // Logging
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "debug", "trace"])
    .default(isProduction ? "info" : "debug"),
});

// Type for the validated environment
export type Env = z.infer<typeof envSchema>;

// Parse and validate environment variables
let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));

    // More detailed error messages
    error.issues.forEach((err) => {
      const path = err.path.join(".");
      console.error(`  ${path}: ${err.message}`);
    });

    process.exit(1);
  }
  throw error;
}

// Helper functions for environment checks
export const isProd = () => env.NODE_ENV === "production";
export const isDev = () => env.NODE_ENV === "development";
export const isTestEnv = () => env.NODE_ENV === "test";

// Export the validated environment object
export { env };

// Default export for convenience
export default env;
