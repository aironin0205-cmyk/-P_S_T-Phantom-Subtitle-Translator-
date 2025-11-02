// ===== DEVELOPMENT/DEBUG ASYNC UTILITY =====
// This file contains helper functions for managing asynchronous operations.

/**
 * Executes a function that returns a promise without awaiting its completion.
 * This is useful for "fire-and-forget" tasks like background logging or non-critical updates.
 * It ensures that any errors within the background task are caught and logged,
 * preventing unhandled promise rejections that could crash the application.
 *
 * @param {() => Promise<any>} promiseFn - A function that returns the promise to execute.
 * @param {import('pino').Logger} logger - The logger instance to use for logging the outcome.
 * @param {string} taskName - A descriptive name for the task for clearer log messages.
 * @returns {void}
 */
export function runInBackground(promiseFn, logger, taskName) {
  logger.info(`Starting background task: [${taskName}]`);

  // We immediately invoke the function to get the promise.
  Promise.resolve(promiseFn())
    .then(() => {
      logger.info(`Background task completed successfully: [${taskName}]`);
    })
    .catch((err) => {
      // It's critical to catch errors here to prevent unhandled promise rejections.
      logger.error({ err, task: taskName }, `Background task failed: [${taskName}]`);
    });
}
