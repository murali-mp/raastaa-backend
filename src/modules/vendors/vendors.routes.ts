import { Router } from 'express';
import { vendorsController } from './vendors.controller';
import { validateBody, validateParams, validateQuery } from '../../middleware/validator';
import { authenticate, optionalAuth, requireVendor } from '../../middleware/auth';
import {
  updateVendorProfileSchema,
  getVendorParams,
  searchVendorsQuery,
  getNearbyVendorsQuery,
  updateLocationSchema,
  goLiveSchema,
  addMenuItemSchema,
  updateMenuItemSchema,
  menuItemParams,
  getVendorPostsQuery,
  getVendorRatingsQuery,
} from './vendors.schema';
import multer from 'multer';

const router = Router();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Public routes
router.get('/search', optionalAuth, vendorsController.searchVendors.bind(vendorsController));
router.get('/nearby', vendorsController.getNearbyVendors.bind(vendorsController));

router.get(
  '/:vendorId',
  optionalAuth,
  validateParams(getVendorParams),
  vendorsController.getVendor.bind(vendorsController)
);

router.get(
  '/:vendorId/menu',
  validateParams(getVendorParams),
  vendorsController.getMenu.bind(vendorsController)
);

router.get(
  '/:vendorId/posts',
  optionalAuth,
  validateParams(getVendorParams),
  vendorsController.getVendorPosts.bind(vendorsController)
);

router.get(
  '/:vendorId/ratings',
  validateParams(getVendorParams),
  vendorsController.getVendorRatings.bind(vendorsController)
);

// Vendor-only routes
router.patch(
  '/me',
  authenticate,
  requireVendor,
  validateBody(updateVendorProfileSchema),
  vendorsController.updateProfile.bind(vendorsController)
);

router.post(
  '/me/photo',
  authenticate,
  requireVendor,
  upload.single('photo'),
  vendorsController.updateStallPhoto.bind(vendorsController)
);

router.post(
  '/me/banner',
  authenticate,
  requireVendor,
  upload.single('banner'),
  vendorsController.updateStallPhoto.bind(vendorsController)
);

router.post(
  '/me/go-live',
  authenticate,
  requireVendor,
  validateBody(goLiveSchema),
  vendorsController.goLive.bind(vendorsController)
);

router.post(
  '/me/location',
  authenticate,
  requireVendor,
  validateBody(updateLocationSchema),
  vendorsController.updateLocation.bind(vendorsController)
);

router.post(
  '/me/go-offline',
  authenticate,
  requireVendor,
  vendorsController.goOffline.bind(vendorsController)
);

router.get(
  '/me/analytics',
  authenticate,
  requireVendor,
  vendorsController.getAnalytics.bind(vendorsController)
);

// Menu management
router.post(
  '/me/menu',
  authenticate,
  requireVendor,
  validateBody(addMenuItemSchema),
  vendorsController.addMenuItem.bind(vendorsController)
);

router.patch(
  '/me/menu/:itemId',
  authenticate,
  requireVendor,
  validateBody(updateMenuItemSchema),
  vendorsController.updateMenuItem.bind(vendorsController)
);

router.delete(
  '/me/menu/:itemId',
  authenticate,
  requireVendor,
  vendorsController.deleteMenuItem.bind(vendorsController)
);

export default router;
