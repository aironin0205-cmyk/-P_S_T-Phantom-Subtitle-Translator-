// ===== DEVELOPMENT/DEBUG TRANSLATION CONTROLLER =====
// This file contains the lean handler functions. Its only job is to connect
// the HTTP request/response cycle to the service layer. It does not contain
// any business logic or dependency instantiation.

// ===== CONTROLLER CLASS =====
export class TranslationController {
  /**
   * @param {import('./translation.service.js').TranslationService} translationService
   */
  constructor(translationService) {
    this.service = translationService;
  }

  // Binds the class methods to `this` to ensure context is not lost when used as route handlers.
  // This is a standard pattern to avoid .bind(this) in the routes file.
  generateBlueprint = async (request, reply) => {
    // The request body is already validated by the Zod schema in the route definition.
    const { subtitleContent, settings } = request.body;
    request.log.info('Blueprint generation request received.');
  
    // Delegate all business logic to the service layer.
    const result = await this.service.generateTranslationBlueprint(subtitleContent, settings);
  
    // Fastify handles JSON serialization automatically.
    reply.status(200).send(result);
  }

  executeTranslation = async (request, reply) => {
    const { jobId, settings, confirmedBlueprint } = request.body;
    request.log.info({ jobId }, 'Translation execution request received.');
  
    const result = await this.service.executeTranslationChain(jobId, confirmedBlueprint, settings);
  
    reply.status(200).send(result);
  }
}
