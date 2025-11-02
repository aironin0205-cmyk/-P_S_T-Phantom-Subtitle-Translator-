// ===== DEVELOPMENT/DEBUG ERROR HANDLER =====
// This middleware centralizes all error handling logic for the application.

// ===== IMPORTS & DEPENDENCIES =====
import { ZodError } from 'zod';
import { ApiError } from '../core/AppError.js';
import config from '../config/index.js';

/**
 * A comprehensive error handler for the Fastify application.
 * It intelligently handles different types of errors: Zod validation errors,
 * custom operational ApiErrors, and unexpected system errors.
 *
 * @param {Error} error The error object.
 * @param {import('fastify').FastifyRequest} request The Fastify request object.
 * @param {import('fastify').FastifyReply} reply The Fastify reply object.
 */
export function zodErrorHandler(error, request, reply) {
  // Use the contextual logger with traceId if available.
  const log = request.log || reply.log;

  if (error instanceof ZodError) {
    // This block handles errors thrown by Zod schema validation.
    // It formats them into a user-friendly 400 Bad Request response.
    log.warn({ details: error.flatten().fieldErrors }, 'Validation error');
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Input validation failed',
      details: error.flatten().fieldErrors,
    });
  }

  if (error instanceof ApiError) {
    // This handles our custom, "expected" errors (e.g., "Resource not found").
    // We trust the status code and message provided by these errors.
    log.warn({ err: error }, 'API Error');
    return reply.status(error.httpStatus).send({
      statusCode: error.httpStatus,
      error: error.name,
      message: error.message,
    });
  }

  // This is the catch-all for any unexpected, non-operational errors.
  // It prevents sensitive information (like stack traces) from leaking in production.
  log.error({ err: error }, `Unhandled internal error for request: ${request.id}`);

  if (config.NODE_ENV === 'production') {
    // In production, we send a generic 500 error message.
    reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred.',
    });
  } else {
    // In development, we provide detailed error information for easier debugging.
    reply.status(500).send({
      statusCode: 500,
      error: error.name || 'Internal Server Error',
      message: error.message,
      stack: error.stack,
    });
  }
}
