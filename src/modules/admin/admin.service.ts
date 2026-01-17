import { prisma } from '../../config/database';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { notifyUser } from '../notifications/notifications.service';
import {
  VendorApprovalInput,
  UserActionInput,
  ContentFlagsQuery,
  ResolveFlagInput,
  BroadcastInput,
} from './admin.schema';

export class AdminService {
  // ==================== Dashboard ====================
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(period: string) {
    const startDate = this.getStartDate(period);

    const [
      totalUsers,
      newUsers,
      totalVendors,
      pendingVendors,
      totalPosts,
      newPosts,
      totalExpeditions,
      pendingFlags,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { created_at: { gte: startDate } } }),
      prisma.vendor.count({ where: { verification_status: 'VERIFIED' } }),
      prisma.vendor.count({ where: { verification_status: 'PENDING_REVIEW' } }),
      prisma.post.count({ where: { status: 'ACTIVE' } }),
      prisma.post.count({ where: { created_at: { gte: startDate } } }),
      prisma.expedition.count(),
      prisma.contentFlag.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      users: {
        total: totalUsers,
        new_in_period: newUsers,
      },
      vendors: {
        total_verified: totalVendors,
        pending_approval: pendingVendors,
      },
      content: {
        total_posts: totalPosts,
        new_posts: newPosts,
        total_expeditions: totalExpeditions,
      },
      moderation: {
        pending_flags: pendingFlags,
      },
    };
  }

  // ==================== Vendor Management ====================
  /**
   * Get pending vendor applications
   */
  async getPendingVendors(limit: number = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const vendors = await prisma.vendor.findMany({
      where: { verification_status: 'PENDING_REVIEW' },
      select: {
        uuid: true,
        store_name: true,
        vendor_name: true,
        phone: true,
        food_categories: true,
        stall_photos: true,
        created_at: true,
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { uuid: decodedCursor },
      }),
      orderBy: { created_at: 'asc' },
    });

    const hasMore = vendors.length > limit;
    const items = hasMore ? vendors.slice(0, -1) : vendors;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Approve or reject a vendor
   */
  async handleVendorApproval(vendorId: string, input: VendorApprovalInput) {
    const vendor = await prisma.vendor.findUnique({
      where: { uuid: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    if (vendor.verification_status !== 'PENDING_REVIEW') {
      throw new Error('Vendor is not pending verification');
    }

    const newStatus = input.status === 'APPROVED' ? 'VERIFIED' : 'UNVERIFIED';

    await prisma.vendor.update({
      where: { uuid: vendorId },
      data: { 
        verification_status: newStatus,
        rejection_reason: input.rejection_reason,
      },
    });

    // TODO: Notify vendor via SMS/push
    console.log(`Vendor ${vendorId} ${newStatus}: ${input.rejection_reason || ''}`);

    return {
      vendor_id: vendorId,
      new_status: newStatus,
    };
  }

  // ==================== Content Moderation ====================
  /**
   * Get content flags
   */
  async getContentFlags(query: ContentFlagsQuery) {
    const { status, target_type, cursor } = query;
    const limit: number = query.limit ?? DEFAULT_PAGE_SIZE;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const flags = await prisma.contentFlag.findMany({
      where: {
        ...(status && { status }),
        ...(target_type && { target_type }),
      },
      include: {
        reporter: {
          select: {
            uuid: true,
            username: true,
          },
        },
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { id: decodedCursor },
      }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = flags.length > limit;
    const items = hasMore ? flags.slice(0, -1) : flags;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.id)
      : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Resolve a content flag
   */
  async resolveFlag(flagId: string, adminId: string, input: ResolveFlagInput) {
    const flag = await prisma.contentFlag.findUnique({
      where: { id: flagId },
    });

    if (!flag) {
      throw new Error('Flag not found');
    }

    // Update flag status
    await prisma.contentFlag.update({
      where: { id: flagId },
      data: {
        status: input.action,
        reviewed_by: adminId,
        reviewed_at: new Date(),
        action_taken: input.content_action,
      },
    });

    // Take action on content if specified
    if (input.content_action === 'REMOVE' && input.action === 'ACTIONED') {
      await this.removeContent(flag.target_type, flag.target_id);
    }

    return {
      flag_id: flagId,
      status: input.action,
    };
  }

  /**
   * Remove content (post, comment, rating)
   */
  private async removeContent(targetType: string, targetId: string) {
    switch (targetType) {
      case 'POST':
        await prisma.post.update({
          where: { uuid: targetId },
          data: { status: 'DELETED' },
        });
        break;
      case 'COMMENT':
        await prisma.comment.update({
          where: { uuid: targetId },
          data: { status: 'DELETED' },
        });
        break;
      case 'RATING':
        await prisma.rating.update({
          where: { uuid: targetId },
          data: { status: 'HIDDEN' },
        });
        break;
    }
  }

  // ==================== User Management ====================
  /**
   * Get users list
   */
  async getUsers(limit: number = DEFAULT_PAGE_SIZE, cursor?: string, search?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const users = await prisma.user.findMany({
      where: search ? {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { display_name: { contains: search, mode: 'insensitive' } },
        ],
      } : undefined,
      select: {
        uuid: true,
        username: true,
        email: true,
        display_name: true,
        profile_picture: true,
        account_status: true,
        created_at: true,
        bottle_caps: true,
        posts_count: true,
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { uuid: decodedCursor },
      }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = users.length > limit;
    const items = hasMore ? users.slice(0, -1) : users;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    // Convert BigInt to Number
    const serializedItems = items.map((u) => ({
      ...u,
      bottle_caps: Number(u.bottle_caps),
    }));

    return { items: serializedItems, nextCursor, hasMore };
  }

  /**
   * Take action on a user
   */
  async handleUserAction(userId: string, adminId: string, input: UserActionInput) {
    const user = await prisma.user.findUnique({
      where: { uuid: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let newStatus = user.account_status;

    switch (input.action) {
      case 'SUSPEND':
        newStatus = 'SUSPENDED';
        break;
      case 'UNSUSPEND':
        newStatus = 'ACTIVE';
        break;
      case 'BAN':
        newStatus = 'BANNED';
        break;
      case 'WARN':
        // Send warning notification
        await notifyUser(
          userId,
          'SYSTEM',
          'Account Warning',
          input.reason || 'You have received a warning from our moderation team.',
          { type: 'warning' }
        );
        break;
    }

    if (newStatus !== user.account_status) {
      await prisma.user.update({
        where: { uuid: userId },
        data: { account_status: newStatus },
      });
    }

    return {
      user_id: userId,
      action: input.action,
      new_status: newStatus,
    };
  }

  // ==================== Broadcast ====================
  /**
   * Send broadcast notification
   */
  async sendBroadcast(adminId: string, input: BroadcastInput) {
    let userIds: string[] = [];

    switch (input.target) {
      case 'all_users':
        const allUsers = await prisma.user.findMany({
          where: { account_status: 'ACTIVE' },
          select: { uuid: true },
        });
        userIds = allUsers.map((u) => u.uuid);
        break;
      case 'specific_users':
        userIds = input.user_ids || [];
        break;
      case 'all_vendors':
        // Vendors don't have notifications in current schema
        break;
    }

    if (userIds.length === 0) {
      return { sent_count: 0 };
    }

    // Create notifications in batches
    const batchSize = 1000;
    let totalSent = 0;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const result = await prisma.notification.createMany({
        data: batch.map((userId) => ({
          user_id: userId,
          type: 'SYSTEM',
          title: input.title,
          body: input.body,
          data: { broadcast: true, admin_id: adminId },
        })),
      });
      totalSent += result.count;
    }

    return {
      sent_count: totalSent,
      target: input.target,
    };
  }

  // ==================== Helpers ====================
  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;
      default:
        return new Date(0);
    }
  }
}

export const adminService = new AdminService();
