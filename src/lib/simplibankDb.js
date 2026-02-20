import mysql from 'mysql2/promise';

/**
 * Simplibank Database Connection Pools
 * 
 * Separate from the main app DB (ekodb_icici).
 * Used for onboarding processing operations that were previously handled by n8n webhooks.
 * 
 * Read pool → Slave server (for SELECT queries)
 * Write pool → Master server (for UPDATE/INSERT queries)
 */

// Validate required environment variables
const requiredVars = ['SB_READ_HOST', 'SB_USER', 'SB_PASSWORD', 'SB_NAME'];
const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
    console.warn(`⚠️  Missing Simplibank env vars: ${missing.join(', ')}. Onboarding processing endpoints will not work.`);
}

const commonConfig = {
    user: process.env.SB_USER,
    password: process.env.SB_PASSWORD,
    database: process.env.SB_NAME,
    port: parseInt(process.env.SB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    timezone: 'Z',
    ssl: process.env.SB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

// Read pool — Slave server
export const sbReadPool = process.env.SB_READ_HOST
    ? mysql.createPool({
        ...commonConfig,
        host: process.env.SB_READ_HOST,
    })
    : null;

// Write pool — Master server (falls back to read host if SB_WRITE_HOST not set)
export const sbWritePool = (process.env.SB_WRITE_HOST || process.env.SB_READ_HOST)
    ? mysql.createPool({
        ...commonConfig,
        host: process.env.SB_WRITE_HOST || process.env.SB_READ_HOST,
    })
    : null;

// Test connection helper
export const testSimplibankConnection = async () => {
    if (!sbReadPool || !sbWritePool) {
        console.warn('⚠️  Simplibank DB not configured, skipping connection test');
        return false;
    }
    try {
        await sbReadPool.query('SELECT 1');
        console.log('✅ Simplibank Read Pool connected');
        await sbWritePool.query('SELECT 1');
        console.log('✅ Simplibank Write Pool connected');
        return true;
    } catch (error) {
        console.error('❌ Simplibank connection failed:', error.message);
        throw error;
    }
};
