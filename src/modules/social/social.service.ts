import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { CACHE_KEYS, DEFAULT_PAGE_SIZE, BOTTLE_CAP_REWARDS } from '../../utils/constants';
import { decodeCursor, encodeCursor } from '../../utils/pagination';

export class SocialService {
  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if already following
    const existing = await prisma.userFollows.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId,
        },
      },
    });

    if (existing) {
      return { already_following: true };
    }

    // Check if blocked
    const blocked = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user_a: followerId, user_b: followingId, status: 'BLOCKED' },
          { user_a: followingId, user_b: followerId, status: 'BLOCKED' },
        ],
      },
    });

    if (blocked) {
      throw new Error('Cannot follow this user');
    }

    await prisma.$transaction([
      prisma.userFollows.create({
        data: {
          follower_id: followerId,
          following_id: followingId,
        },
      }),
      prisma.user.update({
        where: { uuid: followerId },
        data: { following_count: { increment: 1 } },
      }),
      prisma.user.update({
        where: { uuid: followingId },
        data: { followers_count: { increment: 1 } },
      }),
    ]);

    // Create notification
    await prisma.notification.create({
      data: {
        user_id: followingId,
        type: 'FOLLOW',
        title: 'New Follower',
        body: 'Someone started following you',
        data: { follower_id: followerId },
      },
    });

    return { followed: true };
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string) {
    const existing = await prisma.userFollows.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId,
        },
      },
    });

    if (!existing) {
      return { already_not_following: true };
    }

    await prisma.$transaction([
      prisma.userFollows.delete({
        where: {
          follower_id_following_id: {
            follower_id: followerId,
            following_id: followingId,
          },
        },
      }),
      prisma.user.update({
        where: { uuid: followerId },
        data: { following_count: { decrement: 1 } },
      }),
      prisma.user.update({
        where: { uuid: followingId },
        data: { followers_count: { decrement: 1 } },
      }),
    ]);

    return { unfollowed: true };
  }

  /**
   * Follow a vendor
   */
  async followVendor(userId: string, vendorId: string, notifications = true) {
    const existing = await prisma.vendorFollows.findUnique({
      where: {
        user_id_vendor_id: {
          user_id: userId,
          vendor_id: vendorId,
        },
      },
    });

    if (existing) {
      return { already_following: true };
    }

    // Check if first vendor follow (bonus caps)
    const vendorFollowsCount = await prisma.vendorFollows.count({
      where: { user_id: userId },
    });

    await prisma.$transaction(async (tx) => {
      await tx.vendorFollows.create({
        data: {
          user_id: userId,
          vendor_id: vendorId,
          notifications_enabled: notifications,
        },
      });

      await tx.vendor.update({
        where: { uuid: vendorId },
        data: { followers_count: { increment: 1 } },
      });

      // Award caps for first vendor follow
      if (vendorFollowsCount === 0) {
        const user = await tx.user.update({
          where: { uuid: userId },
          data: { bottle_caps: { increment: BOTTLE_CAP_REWARDS.VENDOR_FOLLOW_FIRST } },
        });

        await tx.bottleCapTransaction.create({
          data: {
            user_id: userId,
            amount: BOTTLE_CAP_REWARDS.VENDOR_FOLLOW_FIRST,
            action_type: 'VENDOR_FOLLOW',
            reference_id: vendorId,
            reference_type: 'VENDOR',
            description: 'Bonus for first vendor follow',
            balance_after: user.bottle_caps,
          },
        });
      }
    });

    return { followed: true };
  }

  /**
   * Unfollow a vendor
   */
  async unfollowVendor(userId: string, vendorId: string) {
    const existing = await prisma.vendorFollows.findUnique({
      where: {
        user_id_vendor_id: {
          user_id: userId,
          vendor_id: vendorId,
        },
      },
    });

    if (!existing) {
      return { already_not_following: true };
    }

    await prisma.$transaction([
      prisma.vendorFollows.delete({
        where: {
          user_id_vendor_id: {
            user_id: userId,
            vendor_id: vendorId,
          },
        },
      }),
      prisma.vendor.update({
        where: { uuid: vendorId },
        data: { followers_count: { decrement: 1 } },
      }),
    ]);

    return { unfollowed: true };
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId: string, limit = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const followers = await prisma.userFollows.findMany({
      where: { following_id: userId },
      include: {
        follower: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: {
          follower_id_following_id: {
            follower_id: decodedCursor,
            following_id: userId,
          },
        },
      }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = followers.length > limit;
    const items = hasMore ? followers.slice(0, -1) : followers;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.follower_id) 
      : null;

    return {
      items: items.map((f) => ({
        ...f.follower,
        followed_at: f.created_at,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get user's following
   */
  async getFollowing(userId: string, limit = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const following = await prisma.userFollows.findMany({
      where: { follower_id: userId },
      include: {
        following: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: {
          follower_id_following_id: {
            follower_id: userId,
            following_id: decodedCursor,
          },
        },
      }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = following.length > limit;
    const items = hasMore ? following.slice(0, -1) : following;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.following_id) 
      : null;

    return {
      items: items.map((f) => ({
        ...f.following,
        followed_at: f.created_at,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check existing friendship
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user_a: userId, user_b: targetId },
          { user_a: targetId, user_b: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return { already_friends: true };
      }
      if (existing.status === 'PENDING') {
        // If they sent us a request, accept it
        if (existing.initiated_by === targetId) {
          return this.acceptFriendRequest(existing.id, userId);
        }
        return { request_pending: true };
      }
      if (existing.status === 'BLOCKED') {
        throw new Error('Cannot send friend request');
      }
    }

    const friendship = await prisma.friendship.create({
      data: {
        user_a: userId,
        user_b: targetId,
        status: 'PENDING',
        initiated_by: userId,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        user_id: targetId,
        type: 'FRIEND_REQUEST',
        title: 'Friend Request',
        body: 'You have a new friend request',
        data: { from_user_id: userId, request_id: friendship.id },
      },
    });

    return { request_sent: true, request_id: friendship.id };
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(requestId: string, userId: string) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!friendship) {
      throw new Error('Friend request not found');
    }

    if (friendship.status !== 'PENDING') {
      throw new Error('Request already processed');
    }

    // Verify user is the recipient
    if (friendship.initiated_by === userId) {
      throw new Error('Cannot accept your own request');
    }

    await prisma.friendship.update({
      where: { id: requestId },
      data: {
        status: 'ACCEPTED',
        accepted_at: new Date(),
      },
    });

    // Notify the requester
    await prisma.notification.create({
      data: {
        user_id: friendship.initiated_by,
        type: 'FRIEND_REQUEST',
        title: 'Friend Request Accepted',
        body: 'Your friend request was accepted',
        data: { accepted_by: userId, request_id: requestId },
      },
    });

    return { accepted: true };
  }

  /**
   * Decline friend request
   */
  async declineFriendRequest(requestId: string, userId: string) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!friendship) {
      throw new Error('Friend request not found');
    }

    if (friendship.status !== 'PENDING') {
      throw new Error('Request already processed');
    }

    // Verify user is the recipient
    if (friendship.initiated_by === userId) {
      throw new Error('Cannot decline your own request');
    }

    await prisma.friendship.delete({
      where: { id: requestId },
    });

    return { declined: true };
  }

  /**
   * Get pending friend requests
   */
  async getPendingFriendRequests(userId: string) {
    const requests = await prisma.friendship.findMany({
      where: {
        OR: [
          { user_a: userId, status: 'PENDING' },
          { user_b: userId, status: 'PENDING' },
        ],
      },
      include: {
        userA: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
        userB: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      incoming: requests
        .filter((r) => r.initiated_by !== userId)
        .map((r) => ({
          request_id: r.id,
          user: r.initiated_by === r.user_a ? r.userA : r.userB,
          sent_at: r.created_at,
        })),
      outgoing: requests
        .filter((r) => r.initiated_by === userId)
        .map((r) => ({
          request_id: r.id,
          user: r.initiated_by === r.user_a ? r.userB : r.userA,
          sent_at: r.created_at,
        })),
    };
  }

  /**
   * Get friends list
   */
  async getFriends(userId: string, limit = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { user_a: userId, status: 'ACCEPTED' },
          { user_b: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        userA: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
        userB: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { id: decodedCursor },
      }),
      orderBy: { accepted_at: 'desc' },
    });

    const hasMore = friendships.length > limit;
    const items = hasMore ? friendships.slice(0, -1) : friendships;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.id) 
      : null;

    return {
      items: items.map((f) => ({
        friendship_id: f.id,
        user: f.user_a === userId ? f.userB : f.userA,
        friends_since: f.accepted_at,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Remove friend
   */
  async removeFriend(userId: string, friendId: string) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user_a: userId, user_b: friendId, status: 'ACCEPTED' },
          { user_a: friendId, user_b: userId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!friendship) {
      throw new Error('Friendship not found');
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return { removed: true };
  }
}

export const socialService = new SocialService();
