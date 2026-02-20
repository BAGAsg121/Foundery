import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  submitOnboarding,
  getOnboardingStatus,
  listOnboardings,
  updateStatus,
  isAdmin,
  getOnboardingLogs,
  getDashboardStats
} from '../controllers/onboardingController.js';
import {
  handleVerifyMobile,
  handleVerifyPan,
  handleUpdateOrgName,
  handleFinalConfirm,
  handleLogEmail
} from '../controllers/onboardingProcessController.js';

const router = express.Router();

// User routes
router.post('/submit', protect, submitOnboarding);
router.get('/status', protect, getOnboardingStatus);

// Onboarding processing routes (replaces n8n webhooks)
router.post('/verify-mobile', protect, handleVerifyMobile);
router.post('/verify-pan', protect, handleVerifyPan);
router.post('/update-org-name', protect, handleUpdateOrgName);
router.post('/final-confirm', protect, handleFinalConfirm);
router.post('/log-email', protect, handleLogEmail);

// Admin routes
router.get('/admin/onboardings', protect, isAdmin, listOnboardings);
router.get('/admin/onboarding-logs', protect, isAdmin, getOnboardingLogs);
router.get('/admin/dashboard-stats', protect, isAdmin, getDashboardStats);
router.put('/admin/onboardings/:submissionId/status', protect, isAdmin, updateStatus);

export default router;
