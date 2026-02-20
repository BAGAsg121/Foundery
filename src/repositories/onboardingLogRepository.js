import { writePool } from '../lib/db.js';

/**
 * Log an onboarding step result
 * @param {string} userId - The ID of the user
 * @param {string} stepName - Name of the step (mobile, email, pan, final)
 * @param {string} status - 'success' or 'failure'
 * @param {object|string} details - Additional details or error message
 */
export const logOnboardingStep = async (userId, stepName, status, details) => {
    try {
        const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;

        await writePool.query(
            'INSERT INTO onboarding_logs (user_id, step_name, status, details) VALUES (?, ?, ?, ?)',
            [userId, stepName, status, detailsStr]
        );
    } catch (error) {
        console.error('Error logging onboarding step:', error);
        // Don't throw error to avoid blocking the main flow
    }
};

/**
 * Get latest onboarding logs
 * @param {number} limit - Number of logs to fetch
 * @returns {Promise<Array>} List of logs with user emails
 */
export const getLatestLogs = async (limit = 50) => {
    try {
        const [rows] = await writePool.query(`
            SELECT l.*, u.email 
            FROM onboarding_logs l
            JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC
            LIMIT ?
        `, [limit]);
        return rows;
    } catch (error) {
        console.error('Error fetching latest logs:', error);
        return [];
    }
};

/**
 * Get funnel stats (unique users per step)
 * @returns {Promise<Object>} Counts for each step
 */
export const getFunnelStats = async () => {
    try {
        const [rows] = await writePool.query(`
            SELECT 
                COUNT(CASE WHEN step_name LIKE '%Mobile%' OR step_name = 'mobile' THEN user_id END) as mobile_verified,
                COUNT(CASE WHEN step_name LIKE '%Email%' OR step_name = 'email' THEN user_id END) as email_verified,
                COUNT(CASE WHEN step_name LIKE '%PAN%' OR step_name = 'pan' THEN user_id END) as pan_verified,
                COUNT(CASE WHEN step_name LIKE '%Final%' OR step_name = 'final' THEN user_id END) as final_confirmed
            FROM onboarding_logs
            WHERE status = 'success'
        `);
        return rows[0];
    } catch (error) {
        console.error('Error fetching funnel stats:', error);
        return { mobile_verified: 0, email_verified: 0, pan_verified: 0, final_confirmed: 0 };
    }
};
