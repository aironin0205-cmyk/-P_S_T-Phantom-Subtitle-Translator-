// ===== DEVELOPMENT/DEBUG VECTOR DB CLIENT (PINECONE) =====
// This module manages the singleton connection to the Pinecone vector database.

// ===== IMPORTS & DEPENDENCIES =====
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../core/AppError.js';

// ===== MODULE-LEVEL CLIENT STATE =====
let pineconeIndex = null;

// ===== CONNECTION & HEALTH CHECK LOGIC =====
export async function connectToPinecone() {
  if (pineconeIndex) {
    logger.info('Pinecone index reference already established.');
    return;
  }
  try {
    logger.info('Initializing Pinecone client...');
    const pinecone = new Pinecone({ apiKey: config.PINECONE_API_KEY });
    pineconeIndex = pinecone.index(config.PINECONE_INDEX_NAME);
    await pineconeIndex.describeIndexStats();
    logger.info(`Successfully connected to Pinecone index [${config.PINECONE_INDEX_NAME}].`);
  } catch (err) {
    logger.fatal({ err }, 'Fatal Error: Failed to connect to Pinecone index.');
    process.exit(1);
  }
}

export function getPineconeIndex() {
  if (!pineconeIndex) {
    throw new ApiError('Pinecone index not initialized.', 503, 'PINECONE_UNAVAILABLE');
  }
  return pineconeIndex;
}

export async function closePineconeConnection() {
  logger.info('Pinecone client is stateless; no connection to close.');
}

export async function getPineconeStatus() {
  if (!pineconeIndex) {
    return { name: 'Pinecone', isHealthy: false, message: 'Client not initialized.' };
  }
  try {
    await pineconeIndex.describeIndexStats();
    return { name: 'Pinecone', isHealthy: true, message: 'Connection healthy.' };
  } catch (error) {
    return { name: 'Pinecone', isHealthy: false, message: error.message };
  }
}
