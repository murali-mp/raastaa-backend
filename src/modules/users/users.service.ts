import { prisma } from '../../config/database';
import { redis, redisHelpers } from '../../config/redis';
import { CACHE_KEYS, CACHE_TTL, DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { UpdateProfileInput, SearchUsersQuery, GetBottleCapsHistoryQuery } from './users.schema';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { uploadToSpaces, deleteFromSpaces, getPublicUrl } from '../../config/s3';

export class UsersService {
  async getUserById(userId: string, viewerId?: string) {
    const user = await prisma.user.findUnique({
      where: { uuid: userId },
      select: {
        uuid: true,
        username: true,
        display_name: true,
        bio: true,
        profile_picture: true,
        bottle_caps: true,
        food_preferences: true,
        xp: true,
        level: true,
        account_status: true,
        is_admin: true,
        followers_count: true,
        following_count: true,
        posts_count: true,
        created_at: true,
      },
    });

    if (!user) return null;

    let isFollowing = false;
    let isFriend = false;
    let isBlocked = false;

    if (viewerId && viewerId !== userId) {
      const [follows, friendship, blocked] = await Promise.all([
        prisma.userFollows.findUnique({
          where: {
            follower_id_following_id: {
              follower_id: viewerId,
              following_id: userId,
            },
          },
        }),
        prisma.friendship.findFirst({
          where: {
            OR: [
              { user_a: viewerId, user_b: userId, status: 'ACCEPTED' },
              { user_a: userId, user_b: viewerId, status: 'ACCEPTED' },
            ],
          },
        }),
        prisma.friendship.findFirst({
          where: {
            OR: [
              { user_a: viewerId, user_b: userId, status: 'BLOCKED' },
              { user_a: userId, user_b: viewerId, status: 'BLOCKED' },
            ],
          },
        }),
      ]);

      isFollowing = !!follows;
      isFriend = !!friendship;
      isBlocked = !!blocked;
    }

    return {
      ...user,
      bottle_caps: Number(user.bottle_caps),
      xp: Number(user.xp),
      is_following: isFollowing,
      is_friend: isFriend,
      is_blocked: isBlocked,
    };
  }

  async getUserByUsername(username: string, viewerId?: string) {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { uuid: true },
    });
    if (!user) return null;
    return this.getUserById(user.uuid, viewerId);
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { uuid: userId },
      data: input,
    });
    await redis.del(CACHE_KEYS.USER_PROFILE(userId));
    const { password_hash, ...safe } = user;
    return safe;
  }

  async updateProfilePicture(userId: string, file: Buffer, contentType: string) {
    const user = await prisma.user.findUnique({
      where: { uuid: userId },
      select: { profile_picture: true },
    });

    if (user?.profile_picture?.includes('raastaa')) {
      const key = user.profile_picture.split('/').pop();
      if (key) await deleteFromSpaces(`avatars/${key}`);
    }

    const extension = contentType.split('/')[1] || 'jpg';
    const key = `avatars/${userId}-${Date.now()}.${extension}`;
    await uploadToSpaces(key, file, contentType, true);

    const url = getPublicUrl(key);
    await prisma.user.update({
      where: { uuid: userId },
      data: { profile_picture: url },
    });
    await redis.del(CACHE_KEYS.USER_PROFILE(userId));
    return { profile_picture: url };
  }

  async searchUsers(query: SearchUsersQuery, viewerId?: string) {
    const limit = query.limit || DEFAULT_PAGE_SIZE;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query.q, mode: 'insensitive' } },
              { display_name: { contains: query.q, mode: 'insensitive' } },
            ],
          },
          { account_status: 'ACTIVE' },
        ],
      },
      select: {
        uuid: true,
        username: true,
        display_name: true,
        profile_picture: true,
        is_admin: true,
      },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { uuid: cursor } }),
      orderBy: { username: 'asc' },
    });

    const hasMore = users.length > limit;
    const items = hasMore ? users.slice(0, -1) : users;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.uuid) 
      : null;

    return { items, nextCursor, hasMore };
  }

  async getUserPosts(userId: string, limit: number = DEFAULT_PAGE_SIZE, cursor?: string, viewerId?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const posts = await prisma.post.findMany({
      where: { author_id: userId, status: 'PUBLISHED' },
      include: {
        author: {
          select: { uuid: true, username: true, display_name: true, profile_picture: true },
        },
        vendor: {
          select: { uuid: true, store_name: true, stall_photos: true },
        },
      },
      take: limit + 1,
      ...(decodedCursor && { skip: 1, cursor: { uuid: decodedCursor } }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.uuid) : null;

    let userLikes: Set<string> = new Set();
    if (viewerId && items.length > 0) {
      const likes = await prisma.like.findMany({
        where: { user_id: viewerId, target_type: 'POST', target_id: { in: items.map((p) => p.uuid) } },
        select: { target_id: true },
      });
      userLikes = new Set(likes.map((l) => l.target_id));
    }

    const formattedItems = items.map((post) => ({
      ...post,
      is_liked: userLikes.has(post.uuid),
    }));

    return { items: formattedItems, nextCursor, hasMore };
  }

  async getSavedPosts(userId: string, limit: number = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const savedPosts = await prisma.savedPost.findMany({
      where: { user_id: userId },
      include: {
        post: {
          include: {
            author: { select: { uuid: true, username: true, display_name: true, profile_picture: true } },
            vendor: { select: { uuid: true, store_name: true, stall_photos: true } },
          },
        },
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { user_id_post_id: { user_id: userId, post_id: decodedCursor } },
      }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = savedPosts.length > limit;
    const items = hasMore ? savedPosts.slice(0, -1) : savedPosts;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.post_id) : null;

    const formattedItems = items.map((sp) => ({ ...sp.post, saved_at: sp.created_at }));
    return { items: formattedItems, nextCursor, hasMore };
  }

  async getReferralStats(userId: string) {
    const referralCode = await prisma.referralCode.findFirst({
      where: { user_id: userId },
      include: {
        uses: {
          include: {
            referredUser: {
              select: { uuid: true, username: true, display_name: true, profile_picture: true, created_at: true },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 50,
        },
      },
    });

    if (!referralCode) {
      return { code: null, uses_count: 0, total_caps_earned: 0, referred_users: [] };
    }

    const totalCapsEarned = referralCode.uses.reduce((acc, u) => acc + u.caps_awarded, 0);
    return {
      code: referralCode.code,
      uses_count: referralCode.uses_count,
      total_caps_earned: totalCapsEarned,
      referred_users: referralCode.uses.map((u) => ({
        ...u.referredUser,
        caps_awarded: u.caps_awarded,
        referred_at: u.created_at,
      })),
    };
  }

  async getBottleCapsHistory(userId: string, query: GetBottleCapsHistoryQuery) {
    const limit = query.limit || DEFAULT_PAGE_SIZE;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;

    const whereClause: any = { user_id: userId };
    if (query.type === 'earned') whereClause.amount = { gt: 0 };
    else if (query.type === 'spent') whereClause.amount = { lt: 0 };

    const transactions = await prisma.bottleCapTransaction.findMany({
      where: whereClause,
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = transactions.length > limit;
    const items = hasMore ? transactions.slice(0, -1) : transactions;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.id) : null;

    const user = await prisma.user.findUnique({
      where: { uuid: userId },
      select: { bottle_caps: true },
    });

    return {
      balance: Number(user?.bottle_caps || 0),
      transactions: items.map(t => ({ ...t, amount: Number(t.amount) })),
      nextCursor,
      hasMore,
    };
  }

  async getUserAchievements(userId: string) {
    const userAchievements = await prisma.userAchievement.findMany({
      where: { user_id: userId },
      include: { achievement: true },
      orderBy: { unlocked_at: 'desc' },
    });

    const allAchievements = await prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { tier: 'asc' }],
    });

    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement_id));

    return {
      unlocked: userAchievements.map((ua) => ({
        ...ua.achievement,
        unlocked_at: ua.unlocked_at,
        progress: ua.progress,
      })),
      locked: allAchievements
        .filter((a) => !unlockedIds.has(a.id))
        .map((a) => ({ ...a, unlocked_at: null, progress: 0 })),
    };
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new Error('Cannot block yourself');

    const existing = await prisma.friendship.findFirst({
      where: { user_a: blockerId, user_b: blockedId, status: 'BLOCKED' },
    });
    if (existing) return { already_blocked: true };

    await prisma.$transaction(async (tx) => {
      await tx.friendship.upsert({
        where: { user_a_user_b: { user_a: blockerId, user_b: blockedId } },
        create: { user_a: blockerId, user_b: blockedId, status: 'BLOCKED', initiated_by: blockerId },
        update: { status: 'BLOCKED' },
      });

      await tx.userFollows.deleteMany({
        where: {
          OR: [
            { follower_id: blockerId, following_id: blockedId },
            { follower_id: blockedId, following_id: blockerId },
          ],
        },
      });
    });

    return { blocked: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await prisma.friendship.deleteMany({
      where: { user_a: blockerId, user_b: blockedId, status: 'BLOCKED' },
    });
    return { unblocked: true };
  }

  async getBlockedUsers(userId: string) {
    const blocks = await prisma.friendship.findMany({
      where: { user_a: userId, status: 'BLOCKED' },
      include: {
        userB: { select: { uuid: true, username: true, display_name: true, profile_picture: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return blocks.map((b) => ({ ...b.userB, blocked_at: b.created_at }));
  }

  async deactivateAccount(userId: string) {
    await prisma.user.update({ where: { uuid: userId }, data: { account_status: 'SUSPENDED' } });
    await redis.del(CACHE_KEYS.USER_PROFILE(userId));
    return { deactivated: true };
  }

  async deleteAccount(userId: string) {
    const anonymousUsername = `deleted_${Date.now()}`;
    await prisma.user.update({
      where: { uuid: userId },
      data: {
        account_status: 'SUSPENDED',
        username: anonymousUsername,
        email: `${anonymousUsername}@deleted.local`,
        phone: `deleted_${Date.now()}`,
        display_name: 'Deleted User',
        bio: null,
        profile_picture: null,
      },
    });
    await redis.del(CACHE_KEYS.USER_PROFILE(userId));
    return { deleted: true };
  }

  async getUserExpeditions(userId: string, limit: number = DEFAULT_PAGE_SIZE, cursor?: string) {
    const participations = await prisma.expeditionParticipant.findMany({
      where: { user_id: userId },
      include: {
        expedition: {
          include: {
            creator: { select: { uuid: true, username: true, display_name: true, profile_picture: true } },
            vendors: {
              include: { vendor: { select: { uuid: true, store_name: true, stall_photos: true } } },
            },
          },
        },
      },
      take: limit + 1,
      orderBy: { joined_at: 'desc' },
    });

    const hasMore = participations.length > limit;
    const items = hasMore ? participations.slice(0, -1) : participations;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(`${items[items.length - 1]!.expedition_id}_${items[items.length - 1]!.user_id}`) : null;

    const formattedItems = items.map((p) => ({
      ...p.expedition,
      user_status: p.status,
      user_role: p.role,
      joined_at: p.joined_at,
    }));

    return { items: formattedItems, nextCursor, hasMore };
  }
}

export const usersService = new UsersService();
