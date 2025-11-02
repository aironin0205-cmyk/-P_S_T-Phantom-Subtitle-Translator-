// ===== DEVELOPMENT/DEBUG CORE ERROR SYSTEM =====
// This file centralizes our custom error classes, providing a consistent
// error handling and reporting structure across the entire application.

/**
 * @typedef {object} ApiErrorContext
 * @description Optional structured context to add to an error for logging.
 */

/**
 * The base class for all operational errors in the application.
 * By extending the native Error class, we get proper stack traces.
 *
 * @class ApiError
 * @extends {Error}
 */
export class ApiError extends Error {
  /**
   * @param {string} message - A human-readable description of the error.
   * @param {number} httpStatus - The HTTP status code to be sent in the response.
   * @param {string} errorCode - A short, unique, uppercase error code for programmatic use.
   * @param {ApiErrorContext} [context={}] - Optional structured data about the error for logging.
   */
  constructor(message, httpStatus, errorCode, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.httpStatus = httpStatus;
    this.errorCode = errorCode;
    this.context = context;

    // A flag to easily differentiate our operational errors from unexpected system errors.
    this.isOperational = true;

    // Preserve the original stack trace.
    Error.captureStackTrace(this, this.constructor);
  }
}

// --- CONVENIENCE CLASSES FOR COMMON HTTP STATUSES ---

/**
 * Represents a 400 Bad Request error.
 * Use for client-side errors like invalid input or malformed requests.
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', context = {}) {
    super(message, 400, 'BAD_REQUEST', context);
  }
}

/**
 * Represents a 401 Unauthorized error.
 * Use when authentication is required and has failed or has not yet been provided.
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', context = {}) {
    super(message, 401, 'UNAUTHORIZED', context);
  }
}

/**
 * Represents a 403 Forbidden error.
 * Use when the client is authenticated but does not have permission to access the resource.
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', context = {}) {
    super(message, 403, 'FORBIDDEN', context);
  }
}

/**
 * Represents a 404 Not Found error.
 * Use when the requested resource could not be found.
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Not Found', context = {}) {
    super(message, 404, 'NOT_FOUND', context);
  }
}

/**
 * Represents a 503 Service Unavailable error.
 * Use for operational errors on the server, like a dependency (DB, external API) being down.
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service Unavailable', context = {}) {
    super(message, 503, 'SERVICE_UNAVAILABLE', context);
  }
}
