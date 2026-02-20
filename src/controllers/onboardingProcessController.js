import {
    verifyMobile,
    verifyAndAssignPan,
    updateOrgName,
    finalConfirmation
} from '../services/onboardingService.js';
import { logOnboardingStep } from '../repositories/onboardingLogRepository.js';

/**
 * Onboarding Processing Controller
 * 
 * Express handlers for the 4 onboarding steps that were previously
 * handled by n8n webhooks. All endpoints require JWT authentication.
 */

// Step 1: Verify mobile number → returns customerid
export const handleVerifyMobile = async (req, res) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({ message: 'Mobile number is required' });
        }

        const result = await verifyMobile(mobile);
        await logOnboardingStep(req.user.userId, 'Slide 1: Mobile', 'success', { mobile, ...result });
        res.json(result);
    } catch (error) {
        console.error('Verify mobile error:', error);
        await logOnboardingStep(req.user.userId, 'Slide 1: Mobile', 'failure', error.message);
        res.status(500).json({ message: 'Error verifying mobile number', error: error.message });
    }
};

// Step 3a: Verify and assign PAN
export const handleVerifyPan = async (req, res) => {
    try {
        const { mobile, email, pan } = req.body;

        if (!mobile || !email || !pan) {
            return res.status(400).json({ message: 'Mobile, email, and PAN are required' });
        }

        const result = await verifyAndAssignPan(mobile, email, pan);
        await logOnboardingStep(req.user.userId, 'Slide 3: PAN', 'success', { pan, mobile, email });
        res.json(result);
    } catch (error) {
        console.error('Verify PAN error:', error);
        await logOnboardingStep(req.user.userId, 'Slide 3: PAN', 'failure', error.message);
        res.status(500).json({ message: 'Error verifying PAN', error: error.message });
    }
};

// Step 3b: Update org name (optional)
export const handleUpdateOrgName = async (req, res) => {
    try {
        const { pan, changePanName, panPayload } = req.body;

        if (!panPayload?.mobile || !panPayload?.email || !panPayload?.pan) {
            return res.status(400).json({ message: 'panPayload with mobile, email, and pan is required' });
        }

        const result = await updateOrgName(
            pan,
            changePanName,
            panPayload.mobile,
            panPayload.email
        );
        res.json(result);
    } catch (error) {
        console.error('Update org name error:', error);
        res.status(500).json({ message: 'Error updating org name', error: error.message });
    }
};

// Step 4: Final confirmation
export const handleFinalConfirm = async (req, res) => {
    try {
        const { mobile, email, pan, confirm } = req.body;

        if (!mobile || !email || !pan) {
            return res.status(400).json({ message: 'Mobile, email, and PAN are required' });
        }

        if (!confirm) {
            return res.status(400).json({ message: 'Confirmation is required' });
        }

        const result = await finalConfirmation(mobile, email, pan, confirm);
        await logOnboardingStep(req.user.userId, 'Slide 4: Final', 'success', { mobile, email, pan });
        res.json(result);
    } catch (error) {
        console.error('Final confirm error:', error);
        await logOnboardingStep(req.user.userId, 'Slide 4: Final', 'failure', error.message);
        res.status(500).json({ message: 'Error processing final confirmation', error: error.message });
    }
};

// Step 2: Log Email Verification (Client-side only step, now logged)
export const handleLogEmail = async (req, res) => {
    try {
        const { email, status, details } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        await logOnboardingStep(req.user.userId, 'Slide 2: Email', status || 'success', details || { email });
        res.json({ message: 'Email step logged' });
    } catch (error) {
        console.error('Log email error:', error);
        res.status(500).json({ message: 'Error logging email step' });
    }
};
