CREATE DATABASE IF NOT EXISTS go_live_app;
USE go_live_app;



-- Add these indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_onboarding_user_id ON onboarding_submissions(user_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);


-- Create roles table (skips if already exists)
CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create permissions table (skips if already exists)
CREATE TABLE IF NOT EXISTS permissions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create users table (skips if already exists)
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create user_roles junction table (skips if already exists)
CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_role (user_id, role_id)
);

-- Create role_permissions junction table (skips if already exists)
CREATE TABLE IF NOT EXISTS role_permissions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  role_id CHAR(36) NOT NULL,
  permission_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role_id, permission_id)
);

-- Create onboarding_submissions table (skips if already exists)
CREATE TABLE IF NOT EXISTS onboarding_submissions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  pan VARCHAR(20) NOT NULL,
  org_name VARCHAR(255),
  status ENUM('pending', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create onboarding_logs table for step-by-step tracking
CREATE TABLE IF NOT EXISTS onboarding_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  step_name VARCHAR(50) NOT NULL,
  status ENUM('success', 'failure') NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance (IF NOT EXISTS prevents duplicate index errors)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_user_id ON onboarding_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_logs_user_id ON onboarding_logs(user_id);

-- Insert default roles only if they don't already exist
INSERT IGNORE INTO roles (id, name, description) VALUES
  (UUID(), 'admin', 'Administrator with full access'),
  (UUID(), 'user', 'Regular user with standard permissions'),
  (UUID(), 'viewer', 'View-only access');

-- Insert default permissions only if they don't already exist
INSERT IGNORE INTO permissions (id, name, description) VALUES
  (UUID(), 'can_submit_forms', 'Can submit forms'),
  (UUID(), 'can_view_all_submissions', 'Can view all submissions'),
  (UUID(), 'can_manage_users', 'Can manage user accounts'),
  (UUID(), 'can_manage_roles', 'Can manage roles and permissions');

-- Assign all permissions to admin role (INSERT IGNORE skips if already assigned)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin';

-- Assign basic permission to user role (INSERT IGNORE skips if already assigned)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN ('can_submit_forms');

-- Create a default admin user only if it doesn't already exist
-- (password: admin123 - change this in production!)
INSERT IGNORE INTO users (email, password_hash) 
VALUES ('admin@example.com', 'hashed_password_here');

-- Assign admin role to the default admin user (INSERT IGNORE skips if already assigned)
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@example.com' AND r.name = 'admin';