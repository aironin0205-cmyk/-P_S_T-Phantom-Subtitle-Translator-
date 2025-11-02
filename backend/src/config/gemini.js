// ===== DEVELOPMENT/DEBUG GEMINI CLIENT (CONNECTION) =====
// This module manages the singleton client and the core API call logic for Google Gemini.

// ===== IMPORTS & DEPENDENCIES =====
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from './index.js';
import { logger as globalLogger } from './logger.js';
import { ApiError } from '../core/AppError.js';

// ===== MODULE-LEVEL CLIENT STATE =====
let genAI = null;

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  // ... other harm categories
];

// ===== CONNECTION & API LOGIC =====
export function connectToGemini() {
  if (genAI) {
    globalLogger.info('Google AI client already initialized.');
    return;
  }
  try {
    globalLogger.info('Initializing Google AI client...');
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    globalLogger.info('Google AI client initialized successfully.');
  } catch (err) {
    globalLogger.fatal({ err }, 'Fatal Error: Failed to initialize Google AI client.');
    process.exit(1);
  }
}

/**
 * A robust, instrumented function for calling Gemini models.
 * @param {string} prompt
 * @param {object} options
 * @param {string} options.modelName
 * @param {boolean} [options.expectJson=false]
 * @param {number} [options.temperature=0.5]
 * @returns {Promise<string>}
 * @throws {ApiError}
 */
export async function callGemini(prompt, { modelName, expectJson = false, temperature = 0.5 }) {
  if (!genAI) {
    throw new ApiError('Gemini client not initialized.', 503, 'GEMINI_UNAVAILABLE');
  }

  for (let attempt = 1; attempt <= config.GEMINI_MAX_RETRIES; attempt++) {
    try {
      const generationConfig = {
        temperature,
        ...(expectJson && { responseMimeType: 'application/json' }),
      };
      const model = genAI.getGenerativeModel({ model: modelName, safetySettings, generationConfig });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      const isLastAttempt = attempt === config.GEMINI_MAX_RETRIES;
      const logContext = { attempt, modelName, error: error.message };
      if (isLastAttempt) {
        globalLogger.error(logContext, "Gemini API call failed on final attempt.");
        throw new ApiError(`Gemini API call failed after ${config.GEMINI_MAX_RETRIES} attempts.`, 503, 'GEMINI_API_ERROR', { originalError: error });
      }
      const delay = config.GEMINI_BACKOFF_MS * Math.pow(2, attempt - 1);
      globalLogger.warn(logContext, `Gemini API call failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
