import mysql from 'mysql2/promise';
import { logger } from '../utils/logger';

/**
 * Create and configure database connection pool
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
      logger.success('Database connected successfully');
      logger.info(`Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
      logger.info(`Database: ${process.env.DB_NAME || 'gamefrog_db'}`);
      connection.release();
    })
    .catch((err: any) => {
      logger.error('═══════════════════════════════════════════════════════');
      logger.error('Database connection error');
      logger.error('═══════════════════════════════════════════════════════');
      
      if (err.code === 'ECONNREFUSED') {
        logger.error('MySQL server is not running or not accessible.');
        logger.error(`Attempted to connect to: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
        logger.error('Solutions:');
        logger.error('  1. Start MySQL service (Windows: net start MySQL as Administrator)');
        logger.error('  2. Check if MySQL is running on a different port');
        logger.error('  3. Verify MySQL credentials in .env file');
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        logger.error('Access denied. Check username and password in .env file');
      } else if (err.code === 'ER_BAD_DB_ERROR') {
        logger.error(`Database "${process.env.DB_NAME || 'gamefrog_db'}" does not exist.`);
        logger.error('Run: npm run server:setup (or create database manually)');
      } else {
        logger.error('Error:', err.message || err);
      }
      
      logger.warn('Server will continue running, but database operations may fail.');
    });
};

