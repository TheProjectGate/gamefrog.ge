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
    console.log('🔄 Creating offer_products junction table...');
    
    // Check if table already exists
    const [tables] = await pool.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'offer_products'`,
      [process.env.DB_NAME || 'gamefrog_db']
    );
    
    if ((tables as any[]).length > 0) {
      console.log('ℹ️  Table offer_products already exists. Skipping migration.');
      await pool.end();
      process.exit(0);
    }
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/add_offer_products_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Remove the USE statement if present
    const sql = migrationSQL
      .replace(/^USE\s+\w+;?\s*/gmi, '')
      .trim();
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Table offer_products created');
    console.log('\n💡 You can now link multiple products to offers in the admin panel.');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error running migration:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  Table already exists. Migration may have already been run.');
    } else {
      console.error('Full error:', error);
    }
    await pool.end();
    process.exit(1);
  }
}

runMigration();

