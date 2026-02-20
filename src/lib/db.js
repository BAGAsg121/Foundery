import mysql from 'mysql2/promise';

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Create a connection pool with production-ready settings
// Create a connection pool for WRITE operations
export const writePool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  timezone: 'Z',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

// Create a connection pool for READ operations
// Falls back to DB_HOST if DB_READ_HOST is not set
export const readPool = mysql.createPool({
  host: process.env.DB_READ_HOST || process.env.DB_HOST,
  user: process.env.DB_READ_USER || process.env.DB_USER,
  password: process.env.DB_READ_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_READ_PORT || process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  timezone: 'Z',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

// Helper for testing connections
export const testDbConnection = async () => {
  try {
    const [rows] = await readPool.query('SELECT 1');
    console.log('✅ Database connection established (Read Pool)');
    const [rows2] = await writePool.query('SELECT 1');
    console.log('✅ Database connection established (Write Pool)');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Default export for backward compatibility (uses read pool for safety)
export default readPool;