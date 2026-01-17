import { Router } from 'express';
import { ratingsController } from './ratings.controller';
import { authenticate, requireUser } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validator';
import {
  createRatingSchema,
  updateRatingSchema,
  getRatingsQuery,
  markHelpfulSchema,
  reportRatingSchema,
} from './ratings.schema';

const router = Router();

// ==================== PUBLIC ROUTES ====================
// Get ratings for a vendor
router.get(
  '/vendors/:vendorId',
  validateQuery(getRatingsQuery),
  ratingsController.getVendorRatings
);

// Get vendor rating statistics
router.get(
  '/vendors/:vendorId/stats',
  ratingsController.getVendorStats
);

// Get a specific rating
router.get(
  '/:id',
  ratingsController.getRating
);

// Get a user's ratings
router.get(
  '/users/:userId',
  ratingsController.getUserRatings
);

// ==================== PROTECTED ROUTES ====================
// Get current user's ratings
router.get(
  '/me',
  authenticate,
  requireUser,
  ratingsController.getMyRatings
);

// Create a rating
router.post(
  '/',
  authenticate,
  requireUser,
  validateBody(createRatingSchema),
  ratingsController.createRating
);

// Update a rating
router.put(
  '/:id',
  authenticate,
  requireUser,
  validateBody(updateRatingSchema),
  ratingsController.updateRating
);

// Delete a rating
router.delete(
  '/:id',
  authenticate,
  requireUser,
  ratingsController.deleteRating
);

// Mark a rating as helpful
router.post(
  '/:id/helpful',
  authenticate,
  requireUser,
  validateBody(markHelpfulSchema),
  ratingsController.markHelpful
);

// Report a rating
router.post(
  '/:id/report',
  authenticate,
  requireUser,
  validateBody(reportRatingSchema),
  ratingsController.reportRating
);

export default router;
