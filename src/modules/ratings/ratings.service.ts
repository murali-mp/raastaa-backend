import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { DEFAULT_PAGE_SIZE, BOTTLE_CAP_REWARDS, DAILY_CAPS, CACHE_KEYS, CACHE_TTL } from '../../utils/constants';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { adminNotifications } from '../../utils/discord';
import {
  CreateRatingInput,
  UpdateRatingInput,
  GetRatingsQuery,
  ReportRatingInput,
} from './ratings.schema';

export class RatingsService {
  /**
   * Create a new rating for a vendor
   */
  async createRating(userId: string, input: CreateRatingInput) {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { uuid: input.vendor_id },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Check if user already rated this vendor
    const existingRating = await prisma.rating.findUnique({
      where: {
        user_id_vendor_id: {
          user_id: userId,
          vendor_id: input.vendor_id,
        },
      },
    });

    if (existingRating) {
      throw new Error('You have already rated this vendor');
    }

    // Create rating
    const rating = await prisma.rating.create({
      data: {
        user_id: userId,
        vendor_id: input.vendor_id,
        expedition_id: input.expedition_id,
        hygiene: input.hygiene,
        value_for_money: input.value_for_money,
        taste: input.taste,
        recommendation: input.recommendation,
        review_text: input.review_text,
        photos: input.photos || [],
      },
      include: {
        user: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
      },
    });

    // Update vendor's aggregate ratings
    await this.updateVendorRatings(input.vendor_id);

    // Award bottle caps
    await this.awardRatingCaps(userId, !!(input.photos && input.photos.length > 0));

    // If part of expedition, mark vendor as rated
    if (input.expedition_id) {
      await prisma.expeditionVendor.updateMany({
        where: {
          expedition_id: input.expedition_id,
          vendor_id: input.vendor_id,
        },
        data: { rating_submitted: true },
      });
    }

    // Invalidate vendor cache
    await redis.del(CACHE_KEYS.VENDOR_FULL(input.vendor_id));
    await redis.del(CACHE_KEYS.VENDOR_SUMMARY(input.vendor_id));

    return rating;
  }

  /**
   * Update a rating
   */
  async updateRating(ratingId: string, userId: string, input: UpdateRatingInput) {
    const rating = await prisma.rating.findUnique({
      where: { uuid: ratingId },
    });

    if (!rating) {
      throw new Error('Rating not found');
    }

    if (rating.user_id !== userId) {
      throw new Error('Not authorized to edit this rating');
    }

    const updatedRating = await prisma.rating.update({
      where: { uuid: ratingId },
      data: {
        hygiene: input.hygiene,
        value_for_money: input.value_for_money,
        taste: input.taste,
        recommendation: input.recommendation,
        review_text: input.review_text,
        photos: input.photos,
      },
      include: {
        user: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
      },
    });

    // Update vendor's aggregate ratings
    await this.updateVendorRatings(rating.vendor_id);

    // Invalidate vendor cache
    await redis.del(CACHE_KEYS.VENDOR_FULL(rating.vendor_id));
    await redis.del(CACHE_KEYS.VENDOR_SUMMARY(rating.vendor_id));

    return updatedRating;
  }

  /**
   * Delete a rating
   */
  async deleteRating(ratingId: string, userId: string) {
    const rating = await prisma.rating.findUnique({
      where: { uuid: ratingId },
    });

    if (!rating) {
      throw new Error('Rating not found');
    }

    if (rating.user_id !== userId) {
      throw new Error('Not authorized to delete this rating');
    }

    await prisma.rating.update({
      where: { uuid: ratingId },
      data: { status: 'HIDDEN' },
    });

    // Update vendor's aggregate ratings
    await this.updateVendorRatings(rating.vendor_id);

    // Invalidate vendor cache
    await redis.del(CACHE_KEYS.VENDOR_FULL(rating.vendor_id));
    await redis.del(CACHE_KEYS.VENDOR_SUMMARY(rating.vendor_id));

    return { deleted: true };
  }

  /**
   * Get rating by ID
   */
  async getRatingById(ratingId: string) {
    const rating = await prisma.rating.findUnique({
      where: { uuid: ratingId },
      include: {
        user: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
        vendor: {
          select: {
            uuid: true,
            store_name: true,
            food_categories: true,
          },
        },
      },
    });

    if (!rating || rating.status !== 'ACTIVE') {
      return null;
    }

    return rating;
  }

  /**
   * Get ratings for a vendor
   */
  async getVendorRatings(vendorId: string, query: GetRatingsQuery) {
    const { limit = DEFAULT_PAGE_SIZE, cursor, sort = 'newest' } = query;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const orderBy = (() => {
      switch (sort) {
        case 'oldest':
          return { created_at: 'asc' as const };
        case 'highest':
          return { recommendation: 'desc' as const };
        case 'lowest':
          return { recommendation: 'asc' as const };
        default:
          return { created_at: 'desc' as const };
      }
    })();

    const ratings = await prisma.rating.findMany({
      where: {
        vendor_id: vendorId,
        status: 'ACTIVE',
      },
      include: {
        user: {
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
        cursor: { uuid: decodedCursor },
      }),
      orderBy,
    });

    const hasMore = ratings.length > limit;
    const items = hasMore ? ratings.slice(0, -1) : ratings;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get user's ratings
   */
  async getUserRatings(userId: string, limit: number = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const ratings = await prisma.rating.findMany({
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
      include: {
        vendor: {
          select: {
            uuid: true,
            store_name: true,
            food_categories: true,
          },
        },
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { uuid: decodedCursor },
      }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = ratings.length > limit;
    const items = hasMore ? ratings.slice(0, -1) : ratings;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Mark a rating as helpful
   */
  async markHelpful(ratingId: string, userId: string, helpful: boolean) {
    const rating = await prisma.rating.findUnique({
      where: { uuid: ratingId },
    });

    if (!rating || rating.status !== 'ACTIVE') {
      throw new Error('Rating not found');
    }

    // In a real app, we'd track who marked it helpful to prevent gaming
    // For now, we'll just increment/decrement
    await prisma.rating.update({
      where: { uuid: ratingId },
      data: {
        helpful_count: helpful ? { increment: 1 } : { decrement: 1 },
      },
    });

    return { marked: helpful };
  }

  /**
   * Report a rating
   */
  async reportRating(userId: string, ratingId: string, input: ReportRatingInput) {
    const rating = await prisma.rating.findUnique({
      where: { uuid: ratingId },
      include: { user: { select: { username: true } } },
    });

    if (!rating || rating.status !== 'ACTIVE') {
      throw new Error('Rating not found');
    }

    // Check for duplicate report
    const existingReport = await prisma.contentFlag.findFirst({
      where: {
        reporter_id: userId,
        target_type: 'RATING',
        target_id: ratingId,
        status: { in: ['PENDING', 'REVIEWED'] },
      },
    });

    if (existingReport) {
      return { already_reported: true };
    }

    const report = await prisma.contentFlag.create({
      data: {
        reporter_id: userId,
        target_type: 'RATING',
        target_id: ratingId,
        reason: input.reason,
        details: input.description,
      },
    });

    // Flag rating if multiple reports
    const reportCount = await prisma.contentFlag.count({
      where: {
        target_type: 'RATING',
        target_id: ratingId,
        status: { in: ['PENDING', 'REVIEWED'] },
      },
    });

    if (reportCount >= 3) {
      await prisma.rating.update({
        where: { uuid: ratingId },
        data: { status: 'FLAGGED' },
      });
    }

    // Notify admins
    await adminNotifications.contentReport(
      rating.user?.username || 'Unknown',
      'RATING',
      input.reason,
      input.description
    );

    return { reported: true, report_id: report.id };
  }

  /**
   * Get vendor rating statistics
   */
  async getVendorRatingStats(vendorId: string) {
    const stats = await prisma.rating.aggregate({
      where: {
        vendor_id: vendorId,
        status: 'ACTIVE',
      },
      _avg: {
        hygiene: true,
        value_for_money: true,
        taste: true,
        recommendation: true,
      },
      _count: true,
    });

    // Get rating distribution
    const distribution = await prisma.rating.groupBy({
      by: ['recommendation'],
      where: {
        vendor_id: vendorId,
        status: 'ACTIVE',
      },
      _count: true,
    });

    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => {
      ratingDist[d.recommendation as 1 | 2 | 3 | 4 | 5] = d._count;
    });

    return {
      total_ratings: stats._count,
      averages: {
        hygiene: Number((stats._avg.hygiene || 0).toFixed(1)),
        value_for_money: Number((stats._avg.value_for_money || 0).toFixed(1)),
        taste: Number((stats._avg.taste || 0).toFixed(1)),
        recommendation: Number((stats._avg.recommendation || 0).toFixed(1)),
        overall: Number(
          (
            ((stats._avg.hygiene || 0) +
              (stats._avg.value_for_money || 0) +
              (stats._avg.taste || 0) +
              (stats._avg.recommendation || 0)) /
            4
          ).toFixed(1)
        ),
      },
      distribution: ratingDist,
    };
  }

  // ==================== Private Methods ====================

  /**
   * Update vendor's aggregate rating statistics
   */
  private async updateVendorRatings(vendorId: string) {
    const stats = await prisma.rating.aggregate({
      where: {
        vendor_id: vendorId,
        status: 'ACTIVE',
      },
      _avg: {
        hygiene: true,
        value_for_money: true,
        taste: true,
        recommendation: true,
      },
      _count: true,
    });

    const overall =
      ((stats._avg.hygiene || 0) +
        (stats._avg.value_for_money || 0) +
        (stats._avg.taste || 0) +
        (stats._avg.recommendation || 0)) /
      4;

    await prisma.vendor.update({
      where: { uuid: vendorId },
      data: {
        rating_hygiene: stats._avg.hygiene || 0,
        rating_value: stats._avg.value_for_money || 0,
        rating_taste: stats._avg.taste || 0,
        rating_recommend: stats._avg.recommendation || 0,
        rating_overall: overall,
        total_ratings: stats._count,
      },
    });
  }

  /**
   * Award bottle caps for rating (with daily limit)
   */
  private async awardRatingCaps(userId: string, hasPhotos: boolean) {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${CACHE_KEYS.USER_DAILY_ACTIONS}:${userId}:ratings:${today}`;

    const count = await redis.incr(cacheKey);
    if (count === 1) {
      await redis.expire(cacheKey, 86400); // 24 hours
    }

    if (count <= DAILY_CAPS.RATINGS) {
      const reward = hasPhotos
        ? BOTTLE_CAP_REWARDS.RATING_WITH_PHOTO
        : BOTTLE_CAP_REWARDS.RATING_TEXT;

      const user = await prisma.user.update({
        where: { uuid: userId },
        data: { bottle_caps: { increment: reward } },
      });

      await prisma.bottleCapTransaction.create({
        data: {
          user_id: userId,
          amount: reward,
          action_type: hasPhotos ? 'RATING_WITH_PHOTO' : 'RATING_TEXT',
          reference_type: 'RATING',
          description: `Rating reward ${hasPhotos ? 'with photos' : ''} (${count}/${DAILY_CAPS.RATINGS})`,
          balance_after: user.bottle_caps,
        },
      });
    }
  }
}

export const ratingsService = new RatingsService();
