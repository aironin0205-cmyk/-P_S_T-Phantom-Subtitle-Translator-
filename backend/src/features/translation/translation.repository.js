// ===== DEVELOPMENT/DEBUG TRANSLATION REPOSITORY =====
// This class encapsulates all data access logic for the translation feature.
// Its method signatures have been simplified to rely on the logger injected
// at construction time, cleaning up the service layer calls.

// ===== IMPORTS & DEPENDENCIES =====
import { ObjectId } from 'mongodb';
import { ApiError } from '../../core/AppError.js';

// ===== REPOSITORY CLASS =====
export class TranslationRepository {
  constructor({ db, vectorIndex, logger }) {
    if (!db || !vectorIndex || !logger) {
      throw new Error('TranslationRepository missing dependencies: db, vectorIndex, or logger.');
    }
    this.db = db;
    this.jobsCollection = this.db.collection('translationJobs');
    this.vectorIndex = vectorIndex;
    this.logger = logger;
  }

  async createJob(jobData) {
    const jobDocument = {
      ...jobData,
      status: 'processing_blueprint',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      this.logger.info('Creating new translation job document.');
      const result = await this.jobsCollection.insertOne(jobDocument);
      this.logger.info({ jobId: result.insertedId }, 'Successfully created translation job.');
      return result;
    } catch (error) {
      this.logger.error({ error }, 'Error creating translation job in database.');
      throw new ApiError('Failed to create job in database', 500, 'DATABASE_ERROR', { originalError: error });
    }
  }

  async saveBlueprint(jobId, blueprint) {
    this.logger.info({ jobId }, 'Saving blueprint to database.');
    return this.jobsCollection.updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: { blueprint, status: 'pending_approval', updatedAt: new Date() },
      }
    );
  }

  async saveFinalSrt(jobId, finalSrt) {
    this.logger.info({ jobId }, 'Saving final SRT to database.');
    return this.jobsCollection.updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: { finalSrt, status: 'complete', updatedAt: new Date() },
      }
    );
  }

  async upsertGlossaryVectors(jobId, glossary) {
    this.logger.info({ jobId, glossaryCount: glossary.length }, 'Placeholder: Upserting glossary vectors.');
    return Promise.resolve();
  }

  async getJobById(jobId) {
    this.logger.info({ jobId }, 'Fetching job by ID from database.');
    const job = await this.jobsCollection.findOne({ _id: new ObjectId(jobId) });
    if (!job) {
      this.logger.warn({ jobId }, 'Job not found in database.');
    }
    return job;
  }
}
