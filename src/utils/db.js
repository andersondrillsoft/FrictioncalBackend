import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

export const initializePool = () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });
  return pool;
};

export const initializeDatabase = async () => {
  if (!pool) {
    initializePool();
  }
  
  try {
    console.log('Attempting to connect to database...');
    const client = await pool.connect();
    console.log('Connected to database, creating table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        auth_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized successfully');
    client.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export const validateDbConfig = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL configuration');
  }
  console.log('Database URL validation passed');
};

export const getPool = () => {
  if (!pool) {
    initializePool();
  }
  return pool;
};

export default getPool;
