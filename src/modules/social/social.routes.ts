import { Router } from 'express';
import { socialController } from './social.controller';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validator';
import { followUserSchema, followVendorSchema, friendRequestSchema, respondFriendRequestSchema } from './social.schema';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User follows
router.post('/users/follow', validateBody(followUserSchema), socialController.followUser);
router.delete('/users/:userId/follow', socialController.unfollowUser);
router.get('/users/:userId/followers', socialController.getFollowers);
router.get('/users/:userId/following', socialController.getFollowing);
router.get('/me/followers', socialController.getFollowers);
router.get('/me/following', socialController.getFollowing);

// Vendor follows
router.post('/vendors/follow', validateBody(followVendorSchema), socialController.followVendor);
router.delete('/vendors/:vendorId/follow', socialController.unfollowVendor);

// Friends
router.post('/friends/request', validateBody(friendRequestSchema), socialController.sendFriendRequest);
router.post('/friends/respond', validateBody(respondFriendRequestSchema), socialController.respondFriendRequest);
router.get('/friends/pending', socialController.getPendingFriendRequests);
router.get('/friends', socialController.getFriends);
router.delete('/friends/:friendId', socialController.removeFriend);

export default router;
