import { Router } from 'express';
import { bottleCapsController } from './bottlecaps.controller';
import { authenticate, requireUser, requireAdmin } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validator';
import {
  getTransactionsQuery,
  spendBottleCapsSchema,
  adminBottleCapsSchema,
  leaderboardQuery,
} from './bottlecaps.schema';

const router = Router();

// ==================== PUBLIC ROUTES ====================
// Get leaderboard
router.get(
  '/leaderboard',
  validateQuery(leaderboardQuery),
  bottleCapsController.getLeaderboard
);

// ==================== PROTECTED ROUTES ====================
// Get current user's balance
router.get(
  '/balance',
  authenticate,
  requireUser,
  bottleCapsController.getBalance
);

// Get current user's transaction history
router.get(
  '/transactions',
  authenticate,
  requireUser,
  validateQuery(getTransactionsQuery),
  bottleCapsController.getTransactions
);

// Get daily rewards status
router.get(
  '/daily/status',
  authenticate,
  requireUser,
  bottleCapsController.getDailyStatus
);

// Claim daily reward
router.post(
  '/daily/claim',
  authenticate,
  requireUser,
  bottleCapsController.claimDaily
);

// Spend bottle caps
router.post(
  '/spend',
  authenticate,
  requireUser,
  validateBody(spendBottleCapsSchema),
  bottleCapsController.spend
);

// Get current user's rank
router.get(
  '/rank',
  authenticate,
  requireUser,
  bottleCapsController.getMyRank
);

// ==================== ADMIN ROUTES ====================
// Grant bottle caps
router.post(
  '/admin/grant',
  authenticate,
  requireAdmin,
  validateBody(adminBottleCapsSchema),
  bottleCapsController.adminGrant
);

// Deduct bottle caps
router.post(
  '/admin/deduct',
  authenticate,
  requireAdmin,
  validateBody(adminBottleCapsSchema),
  bottleCapsController.adminDeduct
);

export default router;
