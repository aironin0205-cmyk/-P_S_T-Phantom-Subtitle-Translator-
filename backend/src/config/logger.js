// ===== DEVELOPMENT/DEBUG LOGGER CONFIG =====
// This file centralizes the configuration and instantiation of our application logger.
// It ensures that we have human-readable logs in development and efficient,
// structured JSON logs in production, which is a best practice for platforms like Render.

// ===== IMPORTS & DEPENDENCIES =====
import pino from 'pino';
import { config } from './index.js';

// ===== TRANSPORT CONFIGURATION =====
// A "transport" is a destination for logs. We only define one for development
// to pipe the JSON logs into a "pretty-printer" for readability.
const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    // These options format the log output to be clean and informative.
    colorize: true,
    translateTime: 'SYS:HH:MM:ss', // A more compact timestamp format
    ignore: 'pid,hostname', // Hides noisy, less useful fields in development
  },
});

// ===== LOGGER INSTANTIATION =====
/**
 * The single, shared logger instance for the entire application.
 *
 * In 'development' mode, it uses the human-readable transport.
 * In 'production' or 'test' mode, the transport is ignored, and Pino defaults
 * to writing highly performant, structured JSON to standard output.
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  // This is a conditional spread operator. The 'transport' property is only added
  // to the configuration object if NODE_ENV is 'development'.
  ...(config.NODE_ENV === 'development' && { transport }),
});
