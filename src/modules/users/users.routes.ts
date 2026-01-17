import { Router } from 'express';
import { usersController } from './users.controller';
import { validateBody, validateParams, validateQuery } from '../../middleware/validator';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { apiLimiter } from '../../middleware/rateLimiter';
import {
  updateProfileSchema,
  getUserParams,
  getUsernameParams,
  searchUsersQuery,
  getUserPostsQuery,
  getBottleCapsHistoryQuery,
  blockUserSchema,
} from './users.schema';
import multer from 'multer';

const router = Router();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Public routes
router.get(
  '/search',
  optionalAuth,
  validateQuery(searchUsersQuery),
  usersController.searchUsers.bind(usersController)
);

router.get(
  '/username/:username',
  optionalAuth,
  validateParams(getUsernameParams),
  usersController.getUserByUsername.bind(usersController)
);

router.get(
  '/:userId',
  optionalAuth,
  validateParams(getUserParams),
  usersController.getUser.bind(usersController)
);

router.get(
  '/:userId/posts',
  optionalAuth,
  validateParams(getUserParams),
  validateQuery(getUserPostsQuery),
  usersController.getUserPosts.bind(usersController)
);

// Protected routes
router.patch(
  '/me',
  authenticate,
  validateBody(updateProfileSchema),
  usersController.updateProfile.bind(usersController)
);

router.post(
  '/me/avatar',
  authenticate,
  upload.single('avatar'),
  usersController.updateAvatar.bind(usersController)
);

router.get(
  '/me/saved',
  authenticate,
  validateQuery(getUserPostsQuery),
  usersController.getSavedPosts.bind(usersController)
);

router.get(
  '/me/referrals',
  authenticate,
  usersController.getReferralStats.bind(usersController)
);

router.get(
  '/me/caps/history',
  authenticate,
  validateQuery(getBottleCapsHistoryQuery),
  usersController.getBottleCapsHistory.bind(usersController)
);

router.get(
  '/me/achievements',
  authenticate,
  usersController.getAchievements.bind(usersController)
);

router.get(
  '/me/expeditions',
  authenticate,
  validateQuery(getUserPostsQuery),
  usersController.getUserExpeditions.bind(usersController)
);

router.get(
  '/me/blocked',
  authenticate,
  usersController.getBlockedUsers.bind(usersController)
);

router.post(
  '/block',
  authenticate,
  validateBody(blockUserSchema),
  usersController.blockUser.bind(usersController)
);

router.delete(
  '/block/:userId',
  authenticate,
  validateParams(getUserParams),
  usersController.unblockUser.bind(usersController)
);

router.post(
  '/me/deactivate',
  authenticate,
  usersController.deactivateAccount.bind(usersController)
);

router.delete(
  '/me',
  authenticate,
  usersController.deleteAccount.bind(usersController)
);

export default router;
