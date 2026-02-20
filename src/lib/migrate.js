import { writePool } from './db.js';

/**
 * Auto-migration: creates tables and seeds default data on server startup.
 * Uses IF NOT EXISTS so it's safe to run multiple times.
 * Compatible with MySQL 5.7+
 */
export async function runMigrations() {
  const conn = await writePool.getConnection();

  try {
    console.log('🔄 Running database migrations...');

    // 1. Roles table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ roles table ready');

    // 2. Permissions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ permissions table ready');

    // 3. Users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status ENUM('pending', 'active', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ users table ready');

    // 3b. Ensure status column exists (for existing databases)
    try {
      await conn.query(`
        ALTER TABLE users ADD COLUMN status ENUM('pending', 'active', 'rejected') DEFAULT 'pending'
      `);
      console.log('  ✅ users.status column added');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        // Column already exists — safe to ignore
      } else {
        throw err;
      }
    }

    // 4. User-Roles junction table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_role (user_id, role_id)
      )
    `);
    console.log('  ✅ user_roles table ready');

    // 5. Role-Permissions junction table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE KEY unique_role_permission (role_id, permission_id)
      )
    `);
    console.log('  ✅ role_permissions table ready');

    // 6. Onboarding submissions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS onboarding_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        email VARCHAR(255) NOT NULL,
        pan VARCHAR(20) NOT NULL,
        org_name VARCHAR(255),
        status ENUM('pending', 'in_review', 'completed', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✅ onboarding_submissions table ready');

    // 6b. Onboarding Logs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS onboarding_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        step_name VARCHAR(50) NOT NULL,
        status ENUM('success', 'failure') NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✅ onboarding_logs table ready');

    // 7. Seed default roles
    await conn.query(`INSERT IGNORE INTO roles (name, description) VALUES ('admin', 'Administrator with full access')`);
    await conn.query(`INSERT IGNORE INTO roles (name, description) VALUES ('user', 'Regular user with standard permissions')`);
    await conn.query(`INSERT IGNORE INTO roles (name, description) VALUES ('viewer', 'View-only access')`);
    console.log('  ✅ default roles seeded');

    // 8. Seed default permissions
    await conn.query(`INSERT IGNORE INTO permissions (name, description) VALUES ('can_submit_forms', 'Can submit forms')`);
    await conn.query(`INSERT IGNORE INTO permissions (name, description) VALUES ('can_view_all_submissions', 'Can view all submissions')`);
    await conn.query(`INSERT IGNORE INTO permissions (name, description) VALUES ('can_manage_users', 'Can manage user accounts')`);
    await conn.query(`INSERT IGNORE INTO permissions (name, description) VALUES ('can_manage_roles', 'Can manage roles and permissions')`);
    console.log('  ✅ default permissions seeded');

    // 9. Assign all permissions to admin role
    await conn.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin'
    `);
    console.log('  ✅ admin permissions assigned');

    // 10. Assign basic permission to user role
    await conn.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'user' AND p.name IN ('can_submit_forms')
    `);
    console.log('  ✅ user permissions assigned');

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    conn.release();
  }
}
