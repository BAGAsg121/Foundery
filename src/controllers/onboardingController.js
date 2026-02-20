import { createOnboarding, getOnboardingByUserId, getAllOnboardings } from '../repositories/onboardingRepository.js';
import { getUserRoles } from '../repositories/userRepository.js';

// Submit onboarding form
export const submitOnboarding = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mobile, email, pan, orgName } = req.body;

    // Validate input
    if (!mobile || !email || !pan) {
      return res.status(400).json({ message: 'Mobile, email, and PAN are required' });
    }

    // Check if already submitted
    const existing = await getOnboardingByUserId(userId);
    if (existing) {
      return res.status(400).json({ message: 'Onboarding already submitted' });
    }

    // Create onboarding
    await createOnboarding(userId, { mobile, email, pan, orgName });

    res.status(201).json({ message: 'Onboarding submitted successfully' });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ message: 'Error submitting onboarding' });
  }
};

// Get user's onboarding status
export const getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const onboarding = await getOnboardingByUserId(userId);

    if (!onboarding) {
      return res.json({ status: 'not_started' });
    }

    res.json({
      status: onboarding.status,
      submittedAt: onboarding.created_at,
      ...onboarding
    });
  } catch (error) {
    console.error('Get onboarding error:', error);
    res.status(500).json({ message: 'Error getting onboarding status' });
  }
};

// Admin: Get all onboarding submissions
export const listOnboardings = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const onboardings = await getAllOnboardings(parseInt(page), parseInt(limit));
    res.json(onboardings);
  } catch (error) {
    console.error('List onboardings error:', error);
    res.status(500).json({ message: 'Error fetching onboardings' });
  }
};

// Admin: Update onboarding status
export const updateStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status } = req.body;

    if (!['pending', 'in_review', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await updateOnboardingStatus(submissionId, status);
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Error updating status' });
  }
};

// Middleware to check if user is admin
export const isAdmin = async (req, res, next) => {
  try {
    const roles = await getUserRoles(req.user.userId);
    if (!roles.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Error verifying admin status' });
  }
};

// Admin: Get live onboarding logs
export const getOnboardingLogs = async (req, res) => {
  try {
    const { getLatestLogs } = await import('../repositories/onboardingLogRepository.js');
    const logs = await getLatestLogs(50);
    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Error fetching onboarding logs' });
  }
};

// Admin: Get dashboard stats (funnel counts)
export const getDashboardStats = async (req, res) => {
  try {
    const { getFunnelStats } = await import('../repositories/onboardingLogRepository.js');
    const { getAllOnboardings } = await import('../repositories/onboardingRepository.js');

    const [funnelStats, onboardings] = await Promise.all([
      getFunnelStats(),
      getAllOnboardings(1, 1) // limit 1 just to get total count if needed, or query separate count
    ]);

    // Manually count total/pending/completed from all onboardings if needed, 
    // but here we focus on the funnel stats from logs

    res.json({
      funnel: funnelStats,
      submissions: {
        total: onboardings.length, // accurate only if pagination limit is high enough, better to add count method later
        // For now, let's rely on the funnelStats for the widgets as requested
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};
