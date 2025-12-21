import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Create and configure database connection pool
 * Uses the same database as the main server
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gamefrog_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

/**
 * Test database connection and log results
 */
export const testDatabaseConnection = () => {
  pool.getConnection()
    .then((connection) => {
      console.log('[AI Chat Service] Database connected successfully');
      console.log(`[AI Chat Service] Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
      console.log(`[AI Chat Service] Database: ${process.env.DB_NAME || 'gamefrog_db'}`);
      connection.release();
    })
    .catch((err: any) => {
      console.error('[AI Chat Service] Database connection error');
      
      if (err.code === 'ECONNREFUSED') {
        console.error(`[AI Chat Service] MySQL server is not running or not accessible at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('[AI Chat Service] Access denied. Check username and password in .env file');
      } else if (err.code === 'ER_BAD_DB_ERROR') {
        console.error(`[AI Chat Service] Database "${process.env.DB_NAME || 'gamefrog_db'}" does not exist.`);
      } else {
        console.error('[AI Chat Service] Error:', err.message || err);
      }
      
      console.warn('[AI Chat Service] Server will continue running, but database operations may fail.');
    });
};