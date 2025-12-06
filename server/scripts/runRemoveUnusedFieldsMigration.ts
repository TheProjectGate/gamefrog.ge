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
    console.log('Starting migration: Remove unused offer fields and add name field...');
    
    const migrationPath = join(__dirname, '../migrations/remove_unused_offer_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // First, check if name column exists and add it if it doesn't
    try {
      const [columnCheck] = await pool.execute(
        `SELECT COUNT(*) as count 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'limited_time_offers' 
         AND COLUMN_NAME = 'name'`
      );
      const hasNameColumn = (columnCheck as any[])[0]?.count > 0;
      
      if (!hasNameColumn) {
        await pool.execute(
          `ALTER TABLE limited_time_offers
           ADD COLUMN name VARCHAR(255) DEFAULT NULL COMMENT 'Name for admin identification only'`
        );
        console.log('✓ Added name column');
      } else {
        console.log('✓ Name column already exists');
      }
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠ Name column already exists');
      } else {
        throw error;
      }
    }
    
    for (const statement of statements) {
      if (statement.trim() && !statement.includes('ADD COLUMN name')) {
        try {
          await pool.execute(statement);
          console.log(`✓ Executed: ${statement.substring(0, 50)}...`);
        } catch (error: any) {
          // Ignore errors for columns that don't exist (IF EXISTS should handle this, but some DBs don't support it)
          if (error.code === 'ER_BAD_FIELD_ERROR' || error.message?.includes('Unknown column')) {
            console.log(`⚠ Column already removed or doesn't exist: ${error.message}`);
          } else if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log(`⚠ Column cannot be dropped (may not exist): ${error.message}`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

