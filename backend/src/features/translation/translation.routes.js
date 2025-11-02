// ===== DEVELOPMENT/DEBUG TRANSLATION ROUTES =====
// This file now explicitly converts Zod schemas to JSON Schemas for maximum reliability.

// ===== IMPORTS & DEPENDENCIES =====
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getDb } from '../../config/database.js';
import { getPineconeIndex } from '../../services/vector.service.js';
import { GeminiAgentService } from '../../services/gemini.service.js';
import { TranslationRepository } from './translation.repository.js';
import { TranslationService } from './translation.service.js';
import { TranslationController } from './translation.controller.js';
import { blueprintRequestSchema, executeRequestSchema } from './translation.schemas.js';

// --- CREATE JSON SCHEMAS ---
// We convert our Zod schemas into a format Fastify understands natively.
// This is more explicit and reliable than using a type provider plugin.
const blueprintJsonSchema = {
  body: zodToJsonSchema(blueprintRequestSchema.body, "blueprintRequestSchema"),
};
const executeJsonSchema = {
  body: zodToJsonSchema(executeRequestSchema.body, "executeRequestSchema"),
};


/**
 * @param {import('fastify').FastifyInstance} app
 */
export async function translationRoutes(app) {

  // --- COMPOSITION ROOT for this feature ---
  // We instantiate all dependencies here. The logger is passed from the Fastify instance.
  const repository = new TranslationRepository({ db: getDb(), vectorIndex: getPineconeIndex(), logger: app.log });
  const agentService = new GeminiAgentService({ logger: app.log });
  const translationService = new TranslationService({ repository, agentService, logger: app.log });
  const controller = new TranslationController(translationService);
  
  // --- ROUTE DEFINITIONS ---
  
  app.post(
    '/blueprint', 
    { 
      // Use the converted JSON schema.
      schema: blueprintJsonSchema 
    }, 
    controller.generateBlueprint
  );

  app.post(
    '/execute', 
    { 
      // Use the converted JSON schema.
      schema: executeJsonSchema
    }, 
    controller.executeTranslation
  );
  
  app.log.info('Translation routes registered.');
}
