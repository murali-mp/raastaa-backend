import { Router } from 'express';
import { expeditionsController } from './expeditions.controller';
import { authenticate } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validator';
import {
  createExpeditionSchema,
  updateExpeditionSchema,
  inviteParticipantsSchema,
  respondInviteSchema,
  checkInVendorSchema,
  completeExpeditionSchema,
  getExpeditionsQuery,
  discoverExpeditionsQuery,
} from './expeditions.schema';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User's expeditions
router.get('/me', expeditionsController.getUserExpeditions);
router.get('/invites', expeditionsController.getPendingInvites);

// Discover public expeditions
router.get('/discover', expeditionsController.discoverExpeditions);

// Create expedition
router.post('/', validateBody(createExpeditionSchema), expeditionsController.createExpedition);

// Expedition details
router.get('/:expeditionId', expeditionsController.getExpedition);
router.patch('/:expeditionId', validateBody(updateExpeditionSchema), expeditionsController.updateExpedition);

// Expedition lifecycle
router.post('/:expeditionId/publish', expeditionsController.publishExpedition);
router.post('/:expeditionId/start', expeditionsController.startExpedition);
router.post('/:expeditionId/complete', validateBody(completeExpeditionSchema), expeditionsController.completeExpedition);
router.post('/:expeditionId/cancel', expeditionsController.cancelExpedition);

// Vendor check-in during expedition
router.post('/:expeditionId/check-in', validateBody(checkInVendorSchema), expeditionsController.checkInVendor);
router.post('/:expeditionId/vendors/:vendorId/skip', expeditionsController.skipVendor);

// Participants
router.post('/:expeditionId/invite', validateBody(inviteParticipantsSchema), expeditionsController.inviteParticipants);
router.post('/:expeditionId/respond', validateBody(respondInviteSchema), expeditionsController.respondToInvite);
router.post('/:expeditionId/join', expeditionsController.requestJoin);
router.delete('/:expeditionId/leave', expeditionsController.leaveExpedition);

export default router;
