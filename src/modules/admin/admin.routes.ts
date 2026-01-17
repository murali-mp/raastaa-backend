import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validator';
import {
  vendorApprovalSchema,
  userActionSchema,
  contentFlagsQuery,
  resolveFlagSchema,
  broadcastSchema,
  dashboardQuery,
} from './admin.schema';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// ==================== Dashboard ====================
router.get('/dashboard', adminController.getDashboard);

// ==================== Vendor Management ====================
router.get('/vendors/pending', adminController.getPendingVendors);
router.post(
  '/vendors/:vendorId/approve',
  validateBody(vendorApprovalSchema),
  adminController.approveVendor
);

// ==================== Content Moderation ====================
router.get('/flags', adminController.getContentFlags);
router.post(
  '/flags/:flagId/resolve',
  validateBody(resolveFlagSchema),
  adminController.resolveFlag
);

// ==================== User Management ====================
router.get('/users', adminController.getUsers);
router.post(
  '/users/:userId/action',
  validateBody(userActionSchema),
  adminController.handleUserAction
);

// ==================== Broadcast ====================
router.post(
  '/broadcast',
  validateBody(broadcastSchema),
  adminController.sendBroadcast
);

export default router;
