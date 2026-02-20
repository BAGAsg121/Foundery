import { readPool, writePool } from '../lib/db.js';

// Create a new onboarding submission
export const createOnboarding = async (userId, { mobile, email, pan, orgName }) => {
  const [result] = await writePool.query(
    `INSERT INTO onboarding_submissions 
     (user_id, mobile, email, pan, org_name, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [userId, mobile, email, pan, orgName]
  );
  return result.insertId;
};

// Get onboarding submission by user ID
export const getOnboardingByUserId = async (userId) => {
  const [rows] = await readPool.query(
    'SELECT * FROM onboarding_submissions WHERE user_id = ?',
    [userId]
  );
  return rows[0];
};

// Update onboarding status
export const updateOnboardingStatus = async (submissionId, status) => {
  await writePool.query(
    'UPDATE onboarding_submissions SET status = ? WHERE id = ?',
    [status, submissionId]
  );
};

// Get all onboarding submissions (for admin)
export const getAllOnboardings = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const [rows] = await readPool.query(
    `SELECT os.*, u.email, r.name as role
     FROM onboarding_submissions os
     JOIN users u ON os.user_id = u.id
     JOIN user_roles ur ON u.id = ur.user_id
     JOIN roles r ON ur.role_id = r.id
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
};
