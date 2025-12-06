import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gamefrog_db',
  port: Number(process.env.DB_PORT) || 3306,
  multipleStatements: true,
};

async function runMigration() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully');

    const migrationPath = path.join(__dirname, '../migrations/add_user_contact_info.sql');
    console.log('Reading migration file:', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await connection.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('Added phone and address columns to users table');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runMigration();

