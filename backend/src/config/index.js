// ===== DEVELOPMENT/DEBUG CONFIG LOADER =====
// This file is the single source of truth for all environment-based configuration.
// It uses Zod to validate that all required environment variables are present and correctly typed on startup.
// This "fail-fast" approach prevents a whole class of runtime errors caused by misconfiguration.

// ===== IMPORTS & DEPENDENCIES =====
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Define the schema for your environment variables.
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().url(),

  // MongoDB
  MONGO_URI: z.string().url(),

  // Pinecone
  PINECONE_API_KEY: z.string().min(1),
  PINECONE_INDEX_NAME: z.string().min(1),

  // Google Gemini
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_BLUEPRINT_MODEL: z.string().default('gemini-2.5-flash-latest'),
  GEMINI_TRANSLATION_MODEL: z.string().default('gemini-2.5-flash-latest'),
  GEMINI_SYNC_MODEL: z.string().default('gemini-2.5-pro-latest'),
  GEMINI_MAX_RETRIES: z.coerce.number().default(3),
  GEMINI_BACKOFF_MS: z.coerce.number().default(1000),

  // Fastify Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
});

// Parse and validate the environment variables.
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:', parseResult.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables.');
}

// Export the validated and typed configuration object.
export const config = parseResult.data;
