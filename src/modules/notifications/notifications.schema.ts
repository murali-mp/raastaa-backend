import { z } from 'zod';

// ==================== Get Notifications Query ====================
export const getNotificationsQuery = z.object({
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 20),
  cursor: z.string().optional(),
  unread_only: z.string().optional().transform((val) => val === 'true'),
  type: z.enum([
    'LIKE',
    'COMMENT',
    'FOLLOW',
    'FRIEND_REQUEST',
    'FRIEND_ACCEPTED',
    'EXPEDITION_INVITE',
    'EXPEDITION_UPDATE',
    'ACHIEVEMENT',
    'BOTTLE_CAP_REWARD',
    'SYSTEM',
    'MENTION',
    'VENDOR_UPDATE',
    'RATING_HELPFUL',
  ]).optional(),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuery>;

// ==================== Mark Notifications ====================
export const markNotificationsSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1).max(100),
});

export type MarkNotificationsInput = z.infer<typeof markNotificationsSchema>;

// ==================== Register Push Token ====================
export const registerPushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
  device_id: z.string().optional(),
});

export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
