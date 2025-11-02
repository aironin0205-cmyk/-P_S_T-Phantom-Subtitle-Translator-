// ===== DEVELOPMENT/DEBUG TRANSLATION SERVICE =====
// This is the core business logic layer for the translation feature.
// It orchestrates calls to the repository and external AI services.

// ===== IMPORTS & DEPENDENCIES =====
import { parseSrt, toSrtString } from '../../core/srtParser.js';
import { NotFoundError } from '../../core/AppError.js';
import { runInBackground } from '../../utils/async.js';

// ===== CONSTANTS =====
// It's good practice to extract magic numbers into named constants for clarity and easier maintenance.
const BATCH_SIZE = 25;
const CONCURRENT_BATCHES = 4;

// ===== SERVICE CLASS =====
export class TranslationService {
  constructor({ repository, agentService, logger }) {
    this.repository = repository;
    this.agentService = agentService;
    this.logger = logger;
  }

  /**
   * Orchestrates the creation of a translation blueprint.
   * @param {string} subtitleContent
   * @param {object} settings
   * @returns {Promise<{jobId: string, blueprint: object}>}
   */
  async generateTranslationBlueprint(subtitleContent, settings) {
    this.logger.info("--- Service: Starting Blueprint Generation ---");

    const jobResult = await this.repository.createJob({ subtitleContent, settings });
    const jobId = jobResult.insertedId.toString();
    this.logger.info({ jobId }, "Translation job record created.");

    const isSrtMode = subtitleContent.includes('-->');
    const textToAnalyze = isSrtMode
      ? parseSrt(subtitleContent).map(line => line.text).join('\n')
      : subtitleContent;

    const { keywords } = await this.agentService.extractKeywords(textToAnalyze);
    const { grounded_keywords } = await this.agentService.groundTranslations(keywords);
    const blueprint = await this.agentService.assembleBlueprint(textToAnalyze, settings.tone, grounded_keywords);
    
    await this.repository.saveBlueprint(jobId, blueprint);
    this.logger.info({ jobId }, "Blueprint saved successfully.");

    if (blueprint.glossary?.length > 0) {
      this.logger.info({ jobId, termCount: blueprint.glossary.length }, "Scheduling glossary upsert.");
      runInBackground(
        () => this.repository.upsertGlossaryVectors(jobId, blueprint.glossary),
        this.logger,
        `UpsertGlossaryVectors for Job ${jobId}`
      );
    }
    
    this.logger.info({ jobId }, "--- Service: Blueprint Generation Complete ---");
    return { jobId, blueprint };
  }

  /**
   * Orchestrates the full translation of an SRT file.
   * @param {string} jobId
   * @param {object} confirmedBlueprint
   * @param {object} settings
   * @returns {Promise<{finalSrt: string, syncSuggestions: Array}>}
   */
  async executeTranslationChain(jobId, confirmedBlueprint, settings) {
    this.logger.info({ jobId }, "--- Service: Starting Translation Chain Execution ---");

    const job = await this.repository.getJobById(jobId);
    if (!job) {
      throw new NotFoundError(`Job with ID ${jobId} not found.`);
    }
    
    const srtLines = parseSrt(job.subtitleContent);
    const batches = [];
    for (let i = 0; i < srtLines.length; i += BATCH_SIZE) {
        batches.push(srtLines.slice(i, i + BATCH_SIZE));
    }
    this.logger.info({ jobId, batchCount: batches.length, batchSize: BATCH_SIZE }, "Subtitle content split into batches.");

    const allTranslatedBatches = [];
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const chunk = batches.slice(i, i + CONCURRENT_BATCHES);
      this.logger.info({ jobId, chunkIndex: i / CONCURRENT_BATCHES }, `Processing chunk of ${chunk.length} batches.`);
      
      const chunkPromises = chunk.map(batch => 
        this._processSingleBatch(batch, confirmedBlueprint, settings)
      );
      
      const processedChunks = await Promise.all(chunkPromises);
      allTranslatedBatches.push(...processedChunks);
    }
    
    const translatedLines = allTranslatedBatches.flat();
    
    const finalSrtObject = srtLines.map((line, index) => ({
      ...line,
      text: translatedLines[index] || line.text, // Fallback to original text if a line is missing
    }));
    
    const finalSrtString = toSrtString(finalSrtObject);
    await this.repository.saveFinalSrt(jobId, finalSrtString);
    this.logger.info({ jobId }, "Final SRT saved to job record.");
    
    return { finalSrt: finalSrtString, syncSuggestions: [] }; // Placeholder for sync suggestions
  }

  /**
   * @private
   */
  async _processSingleBatch(batch, blueprint, settings) {
    // The chain of calls is now cleaner, expecting structured JSON arrays from each step.
    const transcreated = await this.agentService.transcreateBatch(batch, blueprint, settings.tone);
    const edited = await this.agentService.editBatch(batch, transcreated, blueprint);
    const qaApproved = await this.agentService.qaBatch(batch, edited, blueprint);
    const finalBatch = await this.agentService.phantomSync(batch, qaApproved);

    // No need for a length check here as the agent service's JSON contract now guarantees it.
    return finalBatch;
  }
  }
