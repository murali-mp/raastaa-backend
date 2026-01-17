import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { DEFAULT_PAGE_SIZE, BOTTLE_CAP_REWARDS, CACHE_KEYS } from '../../utils/constants';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import {
  GetTransactionsQuery,
  SpendBottleCapsInput,
  AdminBottleCapsInput,
  LeaderboardQuery,
} from './bottlecaps.schema';

export class BottleCapsService {
  /**
   * Get user's bottle cap balance
   */
  async getBalance(userId: string) {
    const user = await prisma.user.findUnique({
      where: { uuid: userId },
      select: { bottle_caps: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      balance: Number(user.bottle_caps),
    };
  }

  /**
   * Get user's transaction history
   */
  async getTransactions(userId: string, query: GetTransactionsQuery) {
    const { limit = DEFAULT_PAGE_SIZE, cursor, action_type } = query;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const transactions = await prisma.bottleCapTransaction.findMany({
      where: {
        user_id: userId,
        ...(action_type && { action_type }),
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { id: decodedCursor },
      }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = transactions.length > limit;
    const items = hasMore ? transactions.slice(0, -1) : transactions;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.id)
      : null;

    // Convert BigInt to Number for JSON serialization
    const serializedItems = items.map((t) => ({
      ...t,
      balance_after: Number(t.balance_after),
    }));

    return {
      items: serializedItems,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Claim daily login reward
   */
  async claimDailyReward(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${CACHE_KEYS.USER_DAILY_ACTIONS}:${userId}:daily_claim:${today}`;

    // Check if already claimed
    const claimed = await redis.get(cacheKey);
    if (claimed) {
      return {
        success: false,
        message: 'Daily reward already claimed today',
        next_claim_at: this.getNextDayTimestamp(),
      };
    }

    // Get user's streak info from Redis
    const streakKey = `${CACHE_KEYS.USER_DAILY_ACTIONS}:${userId}:streak`;
    const lastClaimKey = `${CACHE_KEYS.USER_DAILY_ACTIONS}:${userId}:last_claim`;

    const currentStreak = await redis.get(streakKey);
    const lastClaim = await redis.get(lastClaimKey);

    // Calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    if (lastClaim === yesterdayStr && currentStreak) {
      newStreak = Math.min(parseInt(currentStreak) + 1, 7);
    }

    // Calculate reward (increases with streak, max at day 7)
    const baseReward = BOTTLE_CAP_REWARDS.DAILY_LOGIN;
    const streakBonus = Math.floor(baseReward * (newStreak - 1) * 0.1); // 10% more per streak day
    const totalReward = baseReward + streakBonus;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { uuid: userId },
      data: {
        bottle_caps: { increment: totalReward },
      },
    });

    // Create transaction
    await prisma.bottleCapTransaction.create({
      data: {
        user_id: userId,
        amount: totalReward,
        action_type: 'DAILY_LOGIN',
        reference_type: 'STREAK',
        description: `Daily login reward (Day ${newStreak} streak)`,
        balance_after: updatedUser.bottle_caps,
      },
    });

    // Update streak in Redis
    await redis.set(streakKey, newStreak.toString());
    await redis.expire(streakKey, 86400 * 2); // 2 days
    await redis.set(lastClaimKey, today!);
    await redis.expire(lastClaimKey, 86400 * 2); // 2 days

    // Mark today as claimed
    await redis.set(cacheKey, '1');
    await redis.expire(cacheKey, 86400); // 24 hours

    return {
      success: true,
      reward: totalReward,
      streak: newStreak,
      new_balance: Number(updatedUser.bottle_caps),
      next_claim_at: this.getNextDayTimestamp(),
    };
  }

  /**
   * Spend bottle caps
   */
  async spendBottleCaps(userId: string, input: SpendBottleCapsInput) {
    const user = await prisma.user.findUnique({
      where: { uuid: userId },
      select: { bottle_caps: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (Number(user.bottle_caps) < input.amount) {
      throw new Error('Insufficient bottle caps');
    }

    // Deduct caps
    const updatedUser = await prisma.user.update({
      where: { uuid: userId },
      data: {
        bottle_caps: { decrement: input.amount },
      },
    });

    // Create transaction
    await prisma.bottleCapTransaction.create({
      data: {
        user_id: userId,
        amount: -input.amount,
        action_type: 'SPENT',
        reference_type: input.item_type,
        reference_id: input.item_id,
        description: input.description || `Spent on ${input.item_type}`,
        balance_after: updatedUser.bottle_caps,
      },
    });

    return {
      success: true,
      spent: input.amount,
      new_balance: Number(updatedUser.bottle_caps),
    };
  }

  /**
   * Award bottle caps to a user (internal method)
   */
  async awardCaps(
    userId: string,
    amount: number,
    actionType: string,
    referenceType?: string,
    referenceId?: string,
    description?: string
  ) {
    const user = await prisma.user.update({
      where: { uuid: userId },
      data: {
        bottle_caps: { increment: amount },
      },
    });

    await prisma.bottleCapTransaction.create({
      data: {
        user_id: userId,
        amount,
        action_type: actionType,
        reference_type: referenceType,
        reference_id: referenceId,
        description,
        balance_after: user.bottle_caps,
      },
    });

    return { new_balance: Number(user.bottle_caps) };
  }

  /**
   * Admin: Grant bottle caps to a user
   */
  async adminGrant(adminId: string, input: AdminBottleCapsInput) {
    const user = await prisma.user.update({
      where: { uuid: input.user_id },
      data: {
        bottle_caps: { increment: input.amount },
      },
    });

    await prisma.bottleCapTransaction.create({
      data: {
        user_id: input.user_id,
        amount: input.amount,
        action_type: 'ADMIN_GRANT',
        reference_type: 'ADMIN',
        reference_id: adminId,
        description: input.reason,
        balance_after: user.bottle_caps,
      },
    });

    return {
      success: true,
      user_id: input.user_id,
      amount: input.amount,
      new_balance: Number(user.bottle_caps),
    };
  }

  /**
   * Admin: Deduct bottle caps from a user
   */
  async adminDeduct(adminId: string, input: AdminBottleCapsInput) {
    const user = await prisma.user.findUnique({
      where: { uuid: input.user_id },
      select: { bottle_caps: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userBalance = Number(user.bottle_caps);
    const actualDeduct = Math.min(input.amount, userBalance);

    const updatedUser = await prisma.user.update({
      where: { uuid: input.user_id },
      data: {
        bottle_caps: { decrement: actualDeduct },
      },
    });

    await prisma.bottleCapTransaction.create({
      data: {
        user_id: input.user_id,
        amount: -actualDeduct,
        action_type: 'ADMIN_DEDUCT',
        reference_type: 'ADMIN',
        reference_id: adminId,
        description: input.reason,
        balance_after: updatedUser.bottle_caps,
      },
    });

    return {
      success: true,
      user_id: input.user_id,
      amount_deducted: actualDeduct,
      new_balance: Number(updatedUser.bottle_caps),
    };
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(query: LeaderboardQuery) {
    const { period, limit } = query;

    let startDate: Date | undefined;
    const now = new Date();

    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = undefined;
    }

    // For all-time, we can just use the user's bottle_caps
    if (!startDate) {
      const users = await prisma.user.findMany({
        where: { account_status: 'ACTIVE' },
        select: {
          uuid: true,
          username: true,
          display_name: true,
          profile_picture: true,
          bottle_caps: true,
        },
        orderBy: { bottle_caps: 'desc' },
        take: limit,
      });

      return users.map((user, index) => ({
        rank: index + 1,
        user: {
          uuid: user.uuid,
          username: user.username,
          display_name: user.display_name,
          profile_picture: user.profile_picture,
        },
        bottle_caps: Number(user.bottle_caps),
      }));
    }

    // For period-based, aggregate from transactions
    const transactions = await prisma.bottleCapTransaction.groupBy({
      by: ['user_id'],
      where: {
        created_at: { gte: startDate },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const userIds = transactions.map((t) => t.user_id);
    const users = await prisma.user.findMany({
      where: { uuid: { in: userIds } },
      select: {
        uuid: true,
        username: true,
        display_name: true,
        profile_picture: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.uuid, u]));

    return transactions.map((t, index) => {
      const user = userMap.get(t.user_id);
      return {
        rank: index + 1,
        user: user ? {
          uuid: user.uuid,
          username: user.username,
          display_name: user.display_name,
          profile_picture: user.profile_picture,
        } : { uuid: t.user_id, username: 'Unknown' },
        bottle_caps_earned: t._sum.amount || 0,
      };
    });
  }

  /**
   * Get user's rank on leaderboard
   */
  async getUserRank(userId: string) {
    const user = await prisma.user.findUnique({
      where: { uuid: userId },
      select: { bottle_caps: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const rank = await prisma.user.count({
      where: {
        account_status: 'ACTIVE',
        bottle_caps: { gt: user.bottle_caps },
      },
    }) + 1;

    const totalUsers = await prisma.user.count({
      where: { account_status: 'ACTIVE' },
    });

    return {
      rank,
      bottle_caps: Number(user.bottle_caps),
      total_users: totalUsers,
      percentile: Math.round((1 - rank / totalUsers) * 100),
    };
  }

  /**
   * Get daily rewards status
   */
  async getDailyStatus(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${CACHE_KEYS.USER_DAILY_ACTIONS}:${userId}:daily_claim:${today}`;
    const streakKey = `${CACHE_KEYS.USER_DAILY_ACTIONS}:${userId}:streak`;
    const lastClaimKey = `${CACHE_KEYS.USER_DAILY_ACTIONS}:${userId}:last_claim`;

    const claimed = await redis.get(cacheKey);
    const streak = await redis.get(streakKey);
    const lastClaim = await redis.get(lastClaimKey);

    return {
      claimed: !!claimed,
      streak: streak ? parseInt(streak) : 0,
      last_claim: lastClaim || null,
      next_claim_at: claimed ? this.getNextDayTimestamp() : null,
    };
  }

  // ==================== Private Methods ====================

  private getNextDayTimestamp(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}

export const bottleCapsService = new BottleCapsService();
