import { db } from '../config/database';
import { TransactionReason } from '@prisma/client';
import { ValidationError } from '../utils/errors';

export class WalletService {
  /**
   * Get user wallet with balance
   */
  async getWallet(userId: string) {
    let wallet = await db.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      // Create wallet if doesn't exist
      wallet = await db.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    return wallet;
  }

  /**
   * Get wallet transactions
   */
  async getTransactions(userId: string, limit: number = 50, offset: number = 0) {
    const wallet = await this.getWallet(userId);

    const transactions = await db.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return {
      transactions,
      total: transactions.length,
      limit,
      offset,
    };
  }

  /**
   * Add transaction to wallet (idempotent)
   */
  async addTransaction(
    userId: string,
    amount: number,
    reason: TransactionReason,
    referenceType?: string,
    referenceId?: string
  ) {
    const wallet = await this.getWallet(userId);

    // Check for existing transaction (idempotency)
    if (referenceType && referenceId) {
      const existing = await db.walletTransaction.findUnique({
        where: {
          walletId_referenceType_referenceId: {
            walletId: wallet.id,
            referenceType,
            referenceId,
          },
        },
      });

      if (existing) {
        return existing;
      }
    }

    // Calculate new balance
    const newBalance = wallet.balance + amount;

    if (newBalance < 0) {
      throw new ValidationError('Insufficient balance');
    }

    // Create transaction and update wallet in a single transaction
    const transaction = await db.$transaction(async (tx) => {
      const txn = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount,
          reason,
          referenceType,
          referenceId,
          balanceAfter: newBalance,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      return txn;
    });

    return transaction;
  }

  /**
   * Award points for review
   */
  async awardReviewBonus(userId: string, reviewId: string, isVerifiedVisit: boolean) {
    const points = isVerifiedVisit ? 50 : 25;
    return this.addTransaction(
      userId,
      points,
      'REVIEW_BONUS',
      'review',
      reviewId
    );
  }

  /**
   * Award points for verified visit
   */
  async awardVisitReward(userId: string, visitId: string) {
    const points = 25;
    return this.addTransaction(
      userId,
      points,
      'VISIT_REWARD',
      'visit',
      visitId
    );
  }

  /**
   * Award points for challenge completion
   */
  async awardChallengeReward(userId: string, challengeId: string, rewardPoints: number) {
    return this.addTransaction(
      userId,
      rewardPoints,
      'CHALLENGE_COMPLETE',
      'challenge',
      challengeId
    );
  }

  /**
   * Deduct points for redemption
   */
  async redeemPoints(userId: string, amount: number, referenceId: string) {
    return this.addTransaction(
      userId,
      -amount,
      'REDEMPTION',
      'redemption',
      referenceId
    );
  }

  // ============================================================================
  // SOCIAL ENGAGEMENT REWARDS
  // ============================================================================

  /**
   * Award points for liking a post (2 points)
   */
  async awardLikeBonus(userId: string, postId: string) {
    const points = 2;
    return this.addTransaction(
      userId,
      points,
      'LIKE_BONUS',
      'like',
      postId
    );
  }

  /**
   * Award points for commenting on a post (5 points)
   */
  async awardCommentBonus(userId: string, commentId: string) {
    const points = 5;
    return this.addTransaction(
      userId,
      points,
      'COMMENT_BONUS',
      'comment',
      commentId
    );
  }

  /**
   * Award points for creating a post (10 points for tips, 15 for reviews)
   */
  async awardPostBonus(userId: string, postId: string, postType: string) {
    // Different point values based on post type
    const pointsMap: Record<string, number> = {
      'review': 15,
      'tip': 10,
      'checkin': 5,
      'photo': 5,
    };
    const points = pointsMap[postType] || 5;

    return this.addTransaction(
      userId,
      points,
      'POST_BONUS',
      'post',
      postId
    );
  }

  /**
   * Award points for following a user (3 points)
   */
  async awardFollowBonus(userId: string, followedUserId: string) {
    const points = 3;
    return this.addTransaction(
      userId,
      points,
      'FOLLOW_BONUS',
      'follow',
      followedUserId
    );
  }
}

export const walletService = new WalletService();
