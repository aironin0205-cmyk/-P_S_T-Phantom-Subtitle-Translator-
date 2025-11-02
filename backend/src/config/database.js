// ===== DEVELOPMENT/DEBUG DATABASE CLIENT (MONGO) =====
// This module manages the singleton connection to the MongoDB database.

// ===== IMPORTS & DEPENDENCIES =====
import { MongoClient } from 'mongodb';
import { config } from './index.js';
import { logger } from './logger.js';
import { ApiError } from '../core/AppError.js';

// ===== MODULE-LEVEL CLIENT STATE =====
let client;
let dbInstance;

// ===== CONNECTION & HEALTH CHECK LOGIC =====
export async function connectToMongo() {
  if (dbInstance) {
    logger.info('MongoDB connection already established. Skipping.');
    return;
  }
  try {
    logger.info('Initializing MongoDB client...');
    const url = new URL(config.MONGO_URI);
    const dbName = url.pathname.slice(1);

    if (!dbName) {
      logger.fatal('Fatal Error: MONGO_URI must include a database name.');
      process.exit(1);
    }

    client = new MongoClient(config.MONGO_URI, {
      appName: 'pst-backend',
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    dbInstance = client.db(dbName);
    logger.info(`Successfully connected to MongoDB database: "${dbName}".`);
  } catch (err) {
    logger.fatal({ err }, 'Fatal Error: Failed to connect to MongoDB.');
    process.exit(1);
  }
}

export function getDb() {
  if (!dbInstance) {
    throw new ApiError('Database not connected.', 503, 'DB_UNAVAILABLE');
  }
  return dbInstance;
}

export async function closeMongoConnection() {
  if (client) {
    logger.info('Closing MongoDB connection...');
    await client.close();
    logger.info('MongoDB connection closed.');
  }
}

export async function getMongoStatus() {
  if (!client || !dbInstance) {
    return { name: 'MongoDB', isHealthy: false, message: 'Client not initialized.' };
  }
  try {
    await dbInstance.admin().command({ ping: 1 });
    return { name: 'MongoDB', isHealthy: true, message: 'Connection healthy.' };
  } catch (error) {
    return { name: 'MongoDB', isHealthy: false, message: error.message };
  }
}
