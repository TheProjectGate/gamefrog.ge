import express, { Express } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Get and validate port from environment
 */
export const getPort = (): number => {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5433;

  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    logger.error('Invalid PORT value. Must be between 1 and 65535');
    process.exit(1);
  }

  return PORT;
};

/**
 * Create and configure Express app
 */
export const createApp = (): Express => {
  return express();
};

/**
 * Get __dirname for ES modules
 */
export const getDirname = (): string => {
  return __dirname;
};

