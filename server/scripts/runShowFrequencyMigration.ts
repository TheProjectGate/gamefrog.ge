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
  multipleStatements: true // Allow multiple SQL statements
});

async function runMigration() {
  try {
    console.log('🔄 Running show_frequency migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/add_show_frequency_to_offers.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Remove the USE statement if present (we'll use the database from connection)
    const sql = migrationSQL
      .replace(/^USE\s+\w+;?\s*/gmi, '')
      .trim();
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Show frequency migration completed successfully!');
    console.log('✅ Column show_frequency added to limited_time_offers table');
    console.log('\n💡 You can now configure show frequency for offers in the admin panel.');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error running migration:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Column already exists. Migration may have already been run.');
      console.log('✅ Migration is safe to run multiple times.');
    } else {
      console.error('Full error:', error);
    }
    await pool.end();
    process.exit(1);
  }
}

runMigration();

