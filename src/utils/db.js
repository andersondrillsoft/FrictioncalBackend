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
    console.log('Connected to database, creating tables...');

    // Create all tables in the correct order
    await client.query(`
      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        auth_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create subscription_plans table
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        price_usd DECIMAL(10,2) NOT NULL,
        calculations_limit INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create user_subscriptions table
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES subscription_plans(id),
        start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'expired'))
      );

      -- Create calculations table
      CREATE TABLE IF NOT EXISTS calculations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subscription_id INTEGER REFERENCES user_subscriptions(id) ON DELETE CASCADE,
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON user_subscriptions(end_date);
      CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON calculations(user_id);
      CREATE INDEX IF NOT EXISTS idx_calculations_subscription_id ON calculations(subscription_id);
    `);

    // Insert default subscription plans if they don't exist
    await client.query(`
      INSERT INTO subscription_plans (name, price_usd, calculations_limit)
      VALUES 
        ('Free', 0.00, 10),
        ('Premium', 0.49, 20),
        ('Professional', 0.99, 50)
      ON CONFLICT (name) DO UPDATE 
      SET price_usd = EXCLUDED.price_usd,
          calculations_limit = EXCLUDED.calculations_limit;
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
