// ===== DEVELOPMENT/DEBUG SERVER OPERATOR =====
// This file is the application's main entry point. It manages the server's lifecycle.

// ===== IMPORTS & DEPENDENCIES =====
import config from './config/index.js';
import { logger } from './config/logger.js';
import { buildApp } from './app.js';
import { connectToMongo, closeMongoConnection } from './config/database.js';
import { connectToPinecone, closePineconeConnection } from './services/vector.service.js';
import { connectToGemini } from './services/gemini.service.js';

// ===== GRACEFUL SHUTDOWN HANDLER =====
let isShuttingDown = false;
async function gracefulShutdown(app, signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress. Ignoring signal.');
    return;
  }
  isShuttingDown = true;

  logger.warn(`Received ${signal}. Starting graceful shutdown...`);
  try {
    await app.close();
    logger.info('HTTP server closed.');

    await closeMongoConnection();
    await closePineconeConnection();

    logger.info('Graceful shutdown complete.');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown.');
    process.exit(1);
  }
}

// ===== CORE STARTUP LOGIC =====
async function start() {
  logger.info('Application starting up...');
  let app;

  try {
    await connectToMongo();
    await connectToPinecone();
    connectToGemini();
    logger.info('Database and external service connections established.');

    app = buildApp({ logger });
    logger.info('Server instance built.');

    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, () => gracefulShutdown(app, signal));
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal({ reason, promise }, 'Unhandled Promise Rejection. Shutting down...');
      gracefulShutdown(app, 'unhandledRejection');
    });

    process.on('uncaughtException', (err) => {
      logger.fatal(err, 'Uncaught Exception. Shutting down...');
      gracefulShutdown(app, 'uncaughtException');
    });

    await app.listen({ port: config.PORT, host: config.HOST });

  } catch (err) {
    logger.fatal(err, 'Application failed to start.');
    process.exit(1);
  }
}

// ===== APPLICATION BOOTSTRAP =====
start();
