import pool from './db.js';

export const checkDbHealth = async () => {
  try {
    const [rows] = await pool.query('SELECT 1 as db_ok');
    return { 
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { 
      status: 'error',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};