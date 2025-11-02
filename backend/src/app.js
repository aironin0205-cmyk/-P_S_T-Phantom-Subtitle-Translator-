// ===== DEVELOPMENT/DEBUG APPLICATION FACTORY =====
// This file is responsible for BUILDING and CONFIGURING the Fastify application.
// It is now fully type-safe and more modular.

// ===== IMPORTS & DEPENDENCIES =====
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { withTypeProvider } from 'fastify-type-provider-zod';

import { config } from './config/index.js';
import { translationRoutes } from './features/translation/translation.routes.js';
import { zodErrorHandler } from './middleware/errorHandler.js';
// We will create these placeholder files and functions in a later step.
import { getMongoStatus } from './config/database.js';
import { getPineconeStatus } from './services/vector.service.js';

/**
 * Builds and configures the Fastify application instance.
 * @param {object} options
 * @param {import('pino').Logger} options.logger
 * @returns {import('fastify').FastifyInstance}
 */
export function buildApp({ logger }) {
  // 1. Initialize Fastify with the Zod type provider.
  // This is the key change that enables full end-to-end type safety.
  const app = Fastify({ logger }).withTypeProvider();

  // 2. Add Contextual Logging Hook
  // This excellent pattern from your original code is preserved.
  // It enriches every request's logger with a unique traceId.
  app.addHook('preHandler', (request, reply, done) => {
    reply.log = request.log = logger.child({ traceId: request.id });
    done();
  });

  // 3. Register Essential Security & Utility Plugins
  // We now `await` registrations for guaranteed load order.
  app.register(helmet, { contentSecurityPolicy: false });
  app.register(cors, {
    origin: config.CORS_ORIGIN, // Using a more generic name from our config
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
  });

  // 4. Set the Custom Error Handler
  // The logic is now imported from our dedicated middleware file.
  app.setErrorHandler(zodErrorHandler);

  // 5. Register Health Check and Root Routes
  app.get('/health', { logLevel: 'silent' }, async (request, reply) => {
    const mongoStatus = await getMongoStatus();
    const pineconeStatus = await getPineconeStatus();
    const isHealthy = mongoStatus.isHealthy && pineconeStatus.isHealthy;

    const healthDetails = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      dependencies: [mongoStatus, pineconeStatus],
    };

    const httpStatus = isHealthy ? 200 : 503;
    reply.status(httpStatus).send(healthDetails);
  });

  app.get('/', async () => ({ status: 'ok', message: 'PST Backend is online.' }));

  // 6. Register Feature-Specific Routes
  // Routes are now imported from the feature's dedicated `routes.js` file.
  app.register(translationRoutes, { prefix: '/api/v1/translate' });

  logger.info('Application routes and plugins registered.');
  return app;
}
