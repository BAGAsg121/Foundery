ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL,
ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL;

-- Make password nullable for Google users who don't have a password
ALTER TABLE users
MODIFY COLUMN password_hash VARCHAR(255) NULL;
