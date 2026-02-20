ALTER TABLE users
ADD COLUMN status ENUM('pending', 'active', 'rejected') DEFAULT 'pending';
