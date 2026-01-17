import { prisma } from '../../config/database';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { GetNotificationsQuery } from './notifications.schema';

export class NotificationsService {
  /**
   * Get user's notifications
   */
  async getNotifications(userId: string, query: GetNotificationsQuery) {
    const { limit = DEFAULT_PAGE_SIZE, cursor, unread_only, type } = query;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const notifications = await prisma.notification.findMany({
      where: {
        user_id: userId,
        ...(unread_only && { is_read: false }),
        ...(type && { type }),
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { id: decodedCursor },
      }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, -1) : notifications;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.id)
      : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    return { unread_count: count };
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]) {
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        user_id: userId,
      },
      data: { is_read: true },
    });

    return {
      marked_count: result.count,
    };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });

    return {
      marked_count: result.count,
    };
  }

  /**
   * Delete notifications
   */
  async deleteNotifications(userId: string, notificationIds: string[]) {
    const result = await prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        user_id: userId,
      },
    });

    return {
      deleted_count: result.count,
    };
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(userId: string) {
    const result = await prisma.notification.deleteMany({
      where: { user_id: userId },
    });

    return {
      deleted_count: result.count,
    };
  }

  /**
   * Create a notification (internal method)
   */
  async createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ) {
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        body,
        data: data || {},
      },
    });

    // TODO: Send push notification if user has registered device

    return notification;
  }

  /**
   * Create bulk notifications (for broadcast)
   */
  async createBulkNotifications(
    userIds: string[],
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ) {
    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        user_id: userId,
        type,
        title,
        body,
        data: data || {},
      })),
    });

    return { created_count: notifications.count };
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string) {
    // Preferences could be stored in user record or separate table
    // For now, return default preferences
    return {
      push_enabled: true,
      email_enabled: false,
      types: {
        LIKE: true,
        COMMENT: true,
        FOLLOW: true,
        FRIEND_REQUEST: true,
        FRIEND_ACCEPTED: true,
        EXPEDITION_INVITE: true,
        EXPEDITION_UPDATE: true,
        ACHIEVEMENT: true,
        BOTTLE_CAP_REWARD: true,
        SYSTEM: true,
        MENTION: true,
        VENDOR_UPDATE: true,
        RATING_HELPFUL: true,
      },
    };
  }
}

export const notificationsService = new NotificationsService();

// ==================== Helper Functions for Other Services ====================
export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  return notificationsService.createNotification(userId, type, title, body, data);
}

export async function notifyUsers(
  userIds: string[],
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  return notificationsService.createBulkNotifications(userIds, type, title, body, data);
}
