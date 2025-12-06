import { createPool } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gamefrog',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function runMigration() {
  try {
    console.log('Starting migration: Add background_color field to offers...');
    
    // Check if background_color column exists
    const [columnCheck] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'limited_time_offers' 
       AND COLUMN_NAME = 'background_color'`
    );
    const hasBgColorColumn = (columnCheck as any[])[0]?.count > 0;
    
    if (!hasBgColorColumn) {
      await pool.execute(
        `ALTER TABLE limited_time_offers
         ADD COLUMN background_color VARCHAR(7) DEFAULT '#FFFFFF' COMMENT 'Custom background color for offer section on sale page'`
      );
      console.log('✓ Added background_color column');
    } else {
      console.log('✓ background_color column already exists');
    }
    
    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠ background_color column already exists');
      process.exit(0);
    } else {
      console.error('✗ Migration failed:', error.message);
      console.error(error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();

