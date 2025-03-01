import express from 'express';
import {
  getCurrentSubscription,
  updateSubscription,
  recordCalculation,
  getSubscriptionPlans
} from '../controllers/subscriptionController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Public route - no authentication needed
router.get('/plans', getSubscriptionPlans);

// Protected routes - require authentication
router.get('/current', authenticateUser, getCurrentSubscription);
router.post('/update', authenticateUser, updateSubscription);
router.post('/calculate', authenticateUser, recordCalculation);

export default router; 