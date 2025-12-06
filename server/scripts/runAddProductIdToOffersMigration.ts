import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gamefrog_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  multipleStatements: true
});

async function runMigration() {
  try {
    console.log('🔄 Adding product_id column to limited_time_offers table...');
    
    // Check if column already exists
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'limited_time_offers' 
       AND COLUMN_NAME = 'product_id'`,
      [process.env.DB_NAME || 'gamefrog_db']
    );
    
    if ((columns as any[]).length > 0) {
      console.log('ℹ️  Column product_id already exists. Skipping migration.');
      await pool.end();
      process.exit(0);
    }
    
    // Add column
    try {
      await pool.query(`
        ALTER TABLE limited_time_offers
        ADD COLUMN product_id INT NULL COMMENT 'Product ID to open when CTA is clicked (optional, for sale products)'
      `);
    } catch (error: any) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
    
    // Add index (ignore if exists)
    try {
      await pool.query(`
        ALTER TABLE limited_time_offers
        ADD INDEX idx_product_id (product_id)
      `);
    } catch (error: any) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    
    // Add foreign key (ignore if exists)
    try {
      await pool.query(`
        ALTER TABLE limited_time_offers
        ADD CONSTRAINT fk_offers_product_id 
        FOREIGN KEY (product_id) 
        REFERENCES products(id) 
        ON DELETE SET NULL
      `);
    } catch (error: any) {
      if (error.code !== 'ER_DUP_NAME' && error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Column product_id added to limited_time_offers table');
    console.log('\n💡 You can now link offers to sale products in the admin panel.');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error running migration:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Column already exists. Migration may have already been run.');
    } else {
      console.error('Full error:', error);
    }
    await pool.end();
    process.exit(1);
  }
}

runMigration();

