// ===== DEVELOPMENT/DEBUG TRANSLATION ROUTES =====
// This file defines the Fastify plugin for the translation feature.
// It sets up the composition root (instantiating all dependencies) and
// registers all the API endpoints for this feature, attaching schemas and handlers.

// ===== IMPORTS & DEPENDENCIES =====
import { getDb } from '../../config/database.js';
import { getPineconeIndex } from '../../services/vector.service.js';
import { GeminiAgentService } from '../../services/gemini.service.js';
import { TranslationRepository } from './translation.repository.js';
import { TranslationService } from './translation.service.js';
import { TranslationController } from './translation.controller.js';
import { blueprintRequestSchema, executeRequestSchema } from './translation.schemas.js';

/**
 * @param {import('fastify').FastifyInstance} app
 */
export async function translationRoutes(app) {

  // --- COMPOSITION ROOT for this feature ---
  // We instantiate all dependencies here. The logger is passed from the Fastify instance.
  // This isolates dependency management to a single, clear location.
  const repository = new TranslationRepository({ db: getDb(), vectorIndex: getPineconeIndex(), logger: app.log });
  const agentService = new GeminiAgentService({ logger: app.log });
  const translationService = new TranslationService({ repository, agentService, logger: app.log });
  const controller = new TranslationController(translationService);
  
  // --- ROUTE DEFINITIONS ---
  
  app.post(
    '/blueprint', 
    { 
      // Attach the Zod schema for automatic request validation.
      schema: blueprintRequestSchema 
    }, 
    controller.generateBlueprint
  );

  app.post(
    '/execute', 
    { 
      schema: executeRequestSchema 
    }, 
    controller.executeTranslation
  );
  
  app.log.info('Translation routes registered.');
}
