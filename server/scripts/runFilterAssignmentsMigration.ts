import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  let connection;
  
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gamefrog_db',
      multipleStatements: true,
    };

    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Read migration file
    const migrationPath = join(__dirname, '../migrations/add_filter_assignments_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('Running filter_assignments table migration...');
    await connection.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  Table already exists, skipping...');
    } else {
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runMigration();

