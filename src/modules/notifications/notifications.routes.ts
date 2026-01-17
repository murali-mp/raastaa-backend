import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate, requireUser } from '../../middleware/auth';
import { validateBody } from '../../middleware/validator';
import { markNotificationsSchema } from './notifications.schema';

const router = Router();

// All routes require authentication
router.use(authenticate, requireUser);

// Get notifications
router.get('/', notificationsController.getNotifications);

// Get unread count
router.get('/unread-count', notificationsController.getUnreadCount);

// Get preferences
router.get('/preferences', notificationsController.getPreferences);

// Mark notifications as read
router.post(
  '/mark-read',
  validateBody(markNotificationsSchema),
  notificationsController.markAsRead
);

// Mark all as read
router.post('/mark-all-read', notificationsController.markAllAsRead);

// Delete notifications
router.delete(
  '/',
  validateBody(markNotificationsSchema),
  notificationsController.deleteNotifications
);

// Clear all notifications
router.delete('/clear-all', notificationsController.clearAll);

export default router;
