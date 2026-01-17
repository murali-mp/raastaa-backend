import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { CACHE_KEYS, CACHE_TTL, DEFAULT_PAGE_SIZE, BOTTLE_CAP_REWARDS, DAILY_CAPS } from '../../utils/constants';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { extractHashtags, extractMentions } from '../../utils/helpers';
import { adminNotifications } from '../../utils/discord';
import {
  CreatePostInput,
  UpdatePostInput,
  GetFeedQuery,
  ReportPostInput,
} from './posts.schema';

export class PostsService {
  /**
   * Create a new post
   */
  async createPost(authorId: string, input: CreatePostInput) {
    // Extract hashtags and mentions from text content if not provided
    const hashtags = input.hashtags || (input.text_content ? extractHashtags(input.text_content) : []);
    const mentions = input.mentions || (input.text_content ? extractMentions(input.text_content) : []);

    const post = await prisma.post.create({
      data: {
        author_id: authorId,
        vendor_id: input.vendor_id,
        expedition_id: input.expedition_id,
        content_type: input.content_type,
        text_content: input.text_content,
        media_urls: input.media_urls || [],
        hashtags,
        mentions,
        location_lat: input.location_lat,
        location_lng: input.location_lng,
        location_name: input.location_name,
      },
      include: {
        author: {
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
            stall_photos: true,
          },
        },
      },
    });

    // Award bottle caps for posting (with daily limit)
    await this.awardPostCaps(authorId);

    // Update hashtag counts
    if (hashtags.length > 0) {
      await this.updateHashtagCounts(hashtags);
    }

    // Notify mentioned users
    if (mentions.length > 0) {
      await this.notifyMentionedUsers(authorId, post.uuid, mentions);
    }

    return {
      ...post,
      is_liked: false,
      is_saved: false,
    };
  }

  /**
   * Get post by ID
   */
  async getPostById(postId: string, viewerId?: string) {
    const post = await prisma.post.findUnique({
      where: { uuid: postId },
      include: {
        author: {
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
            stall_photos: true,
          },
        },
      },
    });

    if (!post || post.status === 'DELETED') {
      return null;
    }

    // Check like status for viewer
    let isLiked = false;
    let isSaved = false;
    if (viewerId) {
      const [like, saved] = await Promise.all([
        prisma.like.findUnique({
          where: {
            user_id_target_type_target_id: {
              user_id: viewerId,
              target_type: 'POST',
              target_id: postId,
            },
          },
        }),
        prisma.savedPost.findUnique({
          where: {
            user_id_post_id: {
              user_id: viewerId,
              post_id: postId,
            },
          },
        }),
      ]);
      isLiked = !!like;
      isSaved = !!saved;
    }

    return {
      ...post,
      is_liked: isLiked,
      is_saved: isSaved,
    };
  }

  /**
   * Update a post
   */
  async updatePost(postId: string, authorId: string, input: UpdatePostInput) {
    const post = await prisma.post.findUnique({
      where: { uuid: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.author_id !== authorId) {
      throw new Error('Not authorized to edit this post');
    }

    // Re-extract hashtags and mentions if text changed
    const hashtags = input.text_content 
      ? (input.hashtags || extractHashtags(input.text_content))
      : input.hashtags;
    const mentions = input.text_content
      ? (input.mentions || extractMentions(input.text_content))
      : input.mentions;

    const updatedPost = await prisma.post.update({
      where: { uuid: postId },
      data: {
        text_content: input.text_content,
        hashtags,
        mentions,
        location_lat: input.location_lat,
        location_lng: input.location_lng,
        location_name: input.location_name,
        is_edited: true,
        edited_at: new Date(),
      },
      include: {
        author: {
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
            stall_photos: true,
          },
        },
      },
    });

    return updatedPost;
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(postId: string, authorId: string) {
    const post = await prisma.post.findUnique({
      where: { uuid: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.author_id !== authorId) {
      throw new Error('Not authorized to delete this post');
    }

    await prisma.post.update({
      where: { uuid: postId },
      data: { status: 'DELETED' },
    });

    return { deleted: true };
  }

  /**
   * Like a post
   */
  async likePost(userId: string, postId: string) {
    const post = await prisma.post.findUnique({
      where: { uuid: postId },
    });

    if (!post || post.status !== 'ACTIVE') {
      throw new Error('Post not found');
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: 'POST',
          target_id: postId,
        },
      },
    });

    if (existingLike) {
      return { already_liked: true };
    }

    await prisma.$transaction([
      prisma.like.create({
        data: {
          user_id: userId,
          target_type: 'POST',
          target_id: postId,
        },
      }),
      prisma.post.update({
        where: { uuid: postId },
        data: { likes_count: { increment: 1 } },
      }),
    ]);

    // Create notification for post author (if not self-like)
    if (post.author_id !== userId) {
      await prisma.notification.create({
        data: {
          user_id: post.author_id,
          type: 'LIKE',
          title: 'New Like',
          body: 'Someone liked your post',
          data: { post_id: postId, liker_id: userId },
        },
      });
    }

    return { liked: true };
  }

  /**
   * Unlike a post
   */
  async unlikePost(userId: string, postId: string) {
    const existingLike = await prisma.like.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: 'POST',
          target_id: postId,
        },
      },
    });

    if (!existingLike) {
      return { already_unliked: true };
    }

    await prisma.$transaction([
      prisma.like.delete({
        where: {
          user_id_target_type_target_id: {
            user_id: userId,
            target_type: 'POST',
            target_id: postId,
          },
        },
      }),
      prisma.post.update({
        where: { uuid: postId },
        data: { likes_count: { decrement: 1 } },
      }),
    ]);

    return { unliked: true };
  }

  /**
   * Save a post
   */
  async savePost(userId: string, postId: string) {
    const post = await prisma.post.findUnique({
      where: { uuid: postId },
    });

    if (!post || post.status !== 'ACTIVE') {
      throw new Error('Post not found');
    }

    const existing = await prisma.savedPost.findUnique({
      where: {
        user_id_post_id: {
          user_id: userId,
          post_id: postId,
        },
      },
    });

    if (existing) {
      return { already_saved: true };
    }

    await prisma.$transaction([
      prisma.savedPost.create({
        data: {
          user_id: userId,
          post_id: postId,
        },
      }),
      prisma.post.update({
        where: { uuid: postId },
        data: { saves_count: { increment: 1 } },
      }),
    ]);

    return { saved: true };
  }

  /**
   * Unsave a post
   */
  async unsavePost(userId: string, postId: string) {
    const existing = await prisma.savedPost.findUnique({
      where: {
        user_id_post_id: {
          user_id: userId,
          post_id: postId,
        },
      },
    });

    if (!existing) {
      return { already_unsaved: true };
    }

    await prisma.$transaction([
      prisma.savedPost.delete({
        where: {
          user_id_post_id: {
            user_id: userId,
            post_id: postId,
          },
        },
      }),
      prisma.post.update({
        where: { uuid: postId },
        data: { saves_count: { decrement: 1 } },
      }),
    ]);

    return { unsaved: true };
  }

  /**
   * Get saved posts
   */
  async getSavedPosts(userId: string, limit = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const savedPosts = await prisma.savedPost.findMany({
      where: { user_id: userId },
      include: {
        post: {
          include: {
            author: {
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
                stall_photos: true,
              },
            },
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

    const hasMore = savedPosts.length > limit;
    const items = hasMore ? savedPosts.slice(0, -1) : savedPosts;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.id)
      : null;

    return {
      items: items.map((sp) => ({
        ...sp.post,
        saved_at: sp.created_at,
        is_saved: true,
        is_liked: false,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get user's feed (posts from followed users + vendors)
   */
  async getFeed(userId: string, query: GetFeedQuery) {
    const { limit = DEFAULT_PAGE_SIZE, cursor, filter } = query;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    // Get followed users and vendors
    const [followedUsers, followedVendors] = await Promise.all([
      prisma.userFollows.findMany({
        where: { follower_id: userId },
        select: { following_id: true },
      }),
      prisma.vendorFollows.findMany({
        where: { user_id: userId },
        select: { vendor_id: true },
      }),
    ]);

    const followedUserIds = followedUsers.map((f) => f.following_id);
    const followedVendorIds = followedVendors.map((f) => f.vendor_id);

    // Build where clause based on filter
    let whereClause: any = {
      status: 'ACTIVE',
      OR: [
        { author_id: { in: [...followedUserIds, userId] } },
        { vendor_id: { in: followedVendorIds } },
      ],
    };

    if (filter === 'vendors') {
      whereClause = {
        status: 'ACTIVE',
        vendor_id: { in: followedVendorIds },
      };
    } else if (filter === 'friends') {
      // Get friends
      const friendships = await prisma.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ user_a: userId }, { user_b: userId }],
        },
      });
      const friendIds = friendships.map((f) =>
        f.user_a === userId ? f.user_b : f.user_a
      );
      whereClause = {
        status: 'ACTIVE',
        author_id: { in: friendIds },
      };
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        author: {
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
            stall_photos: true,
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

    // Get like and save statuses
    const postIds = posts.map((p) => p.uuid);
    const [likedPosts, savedPosts] = await Promise.all([
      prisma.like.findMany({
        where: {
          user_id: userId,
          target_type: 'POST',
          target_id: { in: postIds },
        },
      }),
      prisma.savedPost.findMany({
        where: {
          user_id: userId,
          post_id: { in: postIds },
        },
      }),
    ]);

    const likedSet = new Set(likedPosts.map((l) => l.target_id));
    const savedSet = new Set(savedPosts.map((s) => s.post_id));

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      items: items.map((post) => ({
        ...post,
        is_liked: likedSet.has(post.uuid),
        is_saved: savedSet.has(post.uuid),
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get discover/explore feed
   */
  async getDiscoverFeed(userId: string, limit = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    // Get trending posts (high engagement in last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const posts = await prisma.post.findMany({
      where: {
        status: 'ACTIVE',
        created_at: { gte: yesterday },
      },
      include: {
        author: {
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
            stall_photos: true,
          },
        },
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { uuid: decodedCursor },
      }),
      orderBy: [
        { likes_count: 'desc' },
        { comments_count: 'desc' },
        { created_at: 'desc' },
      ],
    });

    // Get like and save statuses
    const postIds = posts.map((p) => p.uuid);
    const [likedPosts, savedPosts] = await Promise.all([
      prisma.like.findMany({
        where: {
          user_id: userId,
          target_type: 'POST',
          target_id: { in: postIds },
        },
      }),
      prisma.savedPost.findMany({
        where: {
          user_id: userId,
          post_id: { in: postIds },
        },
      }),
    ]);

    const likedSet = new Set(likedPosts.map((l) => l.target_id));
    const savedSet = new Set(savedPosts.map((s) => s.post_id));

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      items: items.map((post) => ({
        ...post,
        is_liked: likedSet.has(post.uuid),
        is_saved: savedSet.has(post.uuid),
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Search posts by hashtag
   */
  async searchByHashtag(hashtag: string, userId: string, limit = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;
    const normalizedTag = hashtag.toLowerCase().replace(/^#/, '');

    const posts = await prisma.post.findMany({
      where: {
        status: 'ACTIVE',
        hashtags: { has: normalizedTag },
      },
      include: {
        author: {
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
            stall_photos: true,
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

    // Get like statuses
    const postIds = posts.map((p) => p.uuid);
    const likedPosts = await prisma.like.findMany({
      where: {
        user_id: userId,
        target_type: 'POST',
        target_id: { in: postIds },
      },
    });
    const likedSet = new Set(likedPosts.map((l) => l.target_id));

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      hashtag: normalizedTag,
      items: items.map((post) => ({
        ...post,
        is_liked: likedSet.has(post.uuid),
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get trending hashtags
   */
  async getTrendingHashtags(limit = 20) {
    // Get from cache first
    const cacheKey = CACHE_KEYS.TRENDING_HASHTAGS;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate trending hashtags from recent posts
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const posts = await prisma.post.findMany({
      where: {
        status: 'ACTIVE',
        created_at: { gte: yesterday },
        hashtags: { isEmpty: false },
      },
      select: { hashtags: true },
    });

    // Count hashtag occurrences
    const hashtagCounts = new Map<string, number>();
    posts.forEach((post) => {
      post.hashtags.forEach((tag) => {
        hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
      });
    });

    // Sort and limit
    const trending = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([hashtag, count]) => ({ hashtag, post_count: count }));

    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(trending));

    return trending;
  }

  /**
   * Report a post
   */
  async reportPost(userId: string, postId: string, input: ReportPostInput) {
    const post = await prisma.post.findUnique({
      where: { uuid: postId },
      include: { author: { select: { username: true } } },
    });

    if (!post || post.status === 'DELETED') {
      throw new Error('Post not found');
    }

    // Check for duplicate report
    const existingReport = await prisma.contentFlag.findFirst({
      where: {
        reporter_id: userId,
        target_type: 'POST',
        target_id: postId,
        status: { in: ['PENDING', 'REVIEWED'] },
      },
    });

    if (existingReport) {
      return { already_reported: true };
    }

    const report = await prisma.contentFlag.create({
      data: {
        reporter_id: userId,
        target_type: 'POST',
        target_id: postId,
        reason: input.reason,
        details: input.description,
      },
    });

    // Flag post if multiple reports
    const reportCount = await prisma.contentFlag.count({
      where: {
        target_type: 'POST',
        target_id: postId,
        status: { in: ['PENDING', 'REVIEWED'] },
      },
    });

    if (reportCount >= 3) {
      await prisma.post.update({
        where: { uuid: postId },
        data: { status: 'FLAGGED' },
      });
    }

    // Notify admins
    await adminNotifications.contentReport(
      post.author?.username || 'Unknown',
      'POST',
      input.reason,
      input.description
    );

    return { reported: true, report_id: report.id };
  }

  /**
   * Get posts by user
   */
  async getPostsByUser(authorId: string, viewerId?: string, limit = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const posts = await prisma.post.findMany({
      where: {
        author_id: authorId,
        status: 'ACTIVE',
      },
      include: {
        author: {
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
            stall_photos: true,
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

    // Get like statuses for viewer
    let likedSet = new Set<string>();
    if (viewerId) {
      const postIds = posts.map((p) => p.uuid);
      const likedPosts = await prisma.like.findMany({
        where: {
          user_id: viewerId,
          target_type: 'POST',
          target_id: { in: postIds },
        },
      });
      likedSet = new Set(likedPosts.map((l) => l.target_id));
    }

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      items: items.map((post) => ({
        ...post,
        is_liked: likedSet.has(post.uuid),
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get posts by vendor
   */
  async getPostsByVendor(vendorId: string, viewerId?: string, limit = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const posts = await prisma.post.findMany({
      where: {
        vendor_id: vendorId,
        status: 'ACTIVE',
      },
      include: {
        author: {
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
            stall_photos: true,
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

    // Get like statuses for viewer
    let likedSet = new Set<string>();
    if (viewerId) {
      const postIds = posts.map((p) => p.uuid);
      const likedPosts = await prisma.like.findMany({
        where: {
          user_id: viewerId,
          target_type: 'POST',
          target_id: { in: postIds },
        },
      });
      likedSet = new Set(likedPosts.map((l) => l.target_id));
    }

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      items: items.map((post) => ({
        ...post,
        is_liked: likedSet.has(post.uuid),
      })),
      nextCursor,
      hasMore,
    };
  }

  // ==================== Private Methods ====================

  /**
   * Award bottle caps for creating a post (with daily limit)
   */
  private async awardPostCaps(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${CACHE_KEYS.USER_DAILY_ACTIONS}:${userId}:posts:${today}`;

    const count = await redis.incr(cacheKey);
    if (count === 1) {
      await redis.expire(cacheKey, 86400); // 24 hours
    }

    if (count <= DAILY_CAPS.POSTS) {
      const user = await prisma.user.update({
        where: { uuid: userId },
        data: { bottle_caps: { increment: BOTTLE_CAP_REWARDS.POST_CREATE } },
      });

      await prisma.bottleCapTransaction.create({
        data: {
          user_id: userId,
          amount: BOTTLE_CAP_REWARDS.POST_CREATE,
          action_type: 'POST',
          reference_type: 'POST',
          description: `Daily post reward (${count}/${DAILY_CAPS.POSTS})`,
          balance_after: user.bottle_caps,
        },
      });
    }
  }

  /**
   * Update hashtag usage counts
   * NOTE: No hashtag model in current schema - storing hashtags in post.hashtags array only
   */
  private async updateHashtagCounts(hashtags: string[]) {
    // Hashtags are stored directly in post.hashtags array
    // If needed later, add hashtag tracking via Redis or add Hashtag model
    // For now, just cache trending hashtags
    if (hashtags.length > 0) {
      const key = CACHE_KEYS.TRENDING_HASHTAGS;
      for (const tag of hashtags) {
        await redis.zincrby(key, 1, tag);
      }
      // Keep only top 100 and expire in 24h
      await redis.zremrangebyrank(key, 0, -101);
      await redis.expire(key, 86400);
    }
  }

  /**
   * Notify mentioned users
   */
  private async notifyMentionedUsers(authorId: string, postId: string, mentions: string[]) {
    // Get users by username
    const users = await prisma.user.findMany({
      where: {
        username: { in: mentions },
        uuid: { not: authorId }, // Don't notify self
      },
      select: { uuid: true },
    });

    // Create notifications
    for (const user of users) {
      await prisma.notification.create({
        data: {
          user_id: user.uuid,
          type: 'MENTION',
          title: 'You were mentioned',
          body: 'Someone mentioned you in a post',
          data: { post_id: postId, mentioner_id: authorId },
        },
      });
    }
  }
}

export const postsService = new PostsService();
