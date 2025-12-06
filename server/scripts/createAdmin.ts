import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gamefrog_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

async function createAdmin() {
  try {
    const email = 'admin@gmail.com';
    const password = '123456';
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if admin exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if ((existing as any[]).length > 0) {
      // Update existing admin
      await pool.execute(
        'UPDATE users SET password_hash = ?, role = ? WHERE email = ?',
        [passwordHash, 'admin', email]
      );
      console.log('✅ Admin user updated successfully');
    } else {
      // Create new admin
      await pool.execute(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES (?, ?, ?, ?, ?)`,
        [email, passwordHash, 'Admin', 'User', 'admin']
      );
      console.log('✅ Admin user created successfully');
    }
    
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Password Hash: ${passwordHash}`);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();

