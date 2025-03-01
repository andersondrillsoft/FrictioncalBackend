import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

console.log('Attempting to connect to database...');

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to database');
    const result = await client.query('SELECT NOW()');
    console.log('Query result:', result.rows[0]);
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
}

testConnection(); 