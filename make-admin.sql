-- Script to make a user an admin
-- Replace 'USER_EMAIL_HERE' with the actual user's email

-- First, find the user's ID
-- SELECT id, email FROM auth.users WHERE email = 'USER_EMAIL_HERE';

-- Then, update their role to admin
-- Replace 'USER_ID_HERE' with the user's ID from the previous query

DELETE FROM user_roles WHERE user_id = 'USER_ID_HERE';

INSERT INTO user_roles (user_id, role_id)
SELECT 'USER_ID_HERE', id FROM roles WHERE name = 'admin';
