import { readPool, writePool } from '../lib/db.js';

// Get a user by email
export const getUserByEmail = async (email) => {
  try {
    const [rows] = await readPool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    throw error;
  }
};

// Create a new user
export const createUser = async (email, passwordHash, status = 'pending') => {
  try {
    const [result] = await writePool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [email, passwordHash, status]
    );
    return { id: result.insertId };
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
};

// Get user roles by user ID
export const getUserRoles = async (userId) => {
  try {
    const [rows] = await readPool.query(
      `SELECT r.name, r.id
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [userId]
    );
    return rows.map(row => row.name);
  } catch (error) {
    console.error('Error in getUserRoles:', error);
    throw error;
  }
};

// Get user permissions by user ID
export const getUserPermissions = async (userId) => {
  try {
    const [rows] = await readPool.query(
      `SELECT DISTINCT p.name
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = ?`,
      [userId]
    );
    return rows.map(row => row.name);
  } catch (error) {
    console.error('Error in getUserPermissions:', error);
    throw error;
  }
};

// Get all users with their roles
export const getAllUsers = async () => {
  try {
    const [rows] = await readPool.query(
      `SELECT u.id, u.email, u.status, u.created_at, r.name as role, r.id as role_id
             FROM users u
             LEFT JOIN user_roles ur ON u.id = ur.user_id
             LEFT JOIN roles r ON ur.role_id = r.id
             ORDER BY u.created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw error;
  }
};

// Get all available roles
export const getAllRoles = async () => {
  try {
    const [rows] = await readPool.query('SELECT * FROM roles');
    return rows;
  } catch (error) {
    console.error('Error in getAllRoles:', error);
    throw error;
  }
};

// Update user role
export const updateUserRole = async (userId, roleId) => {
  try {
    // First delete existing role (assuming single role per user for now)
    await writePool.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);

    // Insert new role
    await writePool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [userId, roleId]
    );
    return true;
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    throw error;
  }
};

