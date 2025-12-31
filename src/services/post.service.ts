import { db } from '../config/database';
import { FeedPost, Comment } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { serializeComment, serializeFeedPost } from '../utils/serializers';
import { walletService } from './wallet.service';

export interface CreatePostInput {
  authorId: string;
  vendorId?: string;
  postType: 'REVIEW' | 'TIP' | 'PHOTO' | 'CHECKIN';
  body?: string;
  mediaIds?: string[];
}

export interface AddCommentInput {
  authorId: string;
  postId: string;
  body: string;
}

export class PostService {
  /**
   * Create a new feed post
   */
  async createPost(input: CreatePostInput): Promise<FeedPost> {
    const { authorId, vendorId, postType, body, mediaIds = [] } = input;

    // Reviews must be tied to a vendor
    if (postType === 'REVIEW' && (!vendorId || String(vendorId).length === 0)) {
      throw new ValidationError('vendorId is required for review posts');
    }

    // Validate user exists
    const user = await db.user.findUnique({
      where: { id: authorId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate vendor if provided
    if (vendorId) {
      const vendor = await db.vendor.findUnique({
        where: { id: vendorId },
      });

      if (!vendor) {
        throw new NotFoundError('Vendor not found');
      }
    }

    // Reviews: latest overrides previous review(s) for same vendor by same author
    const post = await db.$transaction(async (tx) => {
      if (postType === 'REVIEW' && vendorId) {
        await tx.feedPost.deleteMany({
          where: {
            authorId,
            vendorId,
            postType: 'REVIEW',
          },
        });
      }

      return tx.feedPost.create({
        data: {
          authorId,
          vendorId,
          postType,
          body,
          status: 'VISIBLE',
          media: mediaIds.length > 0 ? {
            create: mediaIds.map((mediaId, index) => ({
              mediaId,
              sortOrder: index,
            })),
          } : undefined,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              trustScore: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          vendor: {
            include: {
              location: true,
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          },
          media: {
            include: {
              media: true,
            },
          },
        },
      });
    });

    // Award points for creating the post
    try {
      await walletService.awardPostBonus(authorId, post.id, postType.toLowerCase());
    } catch {
      // Silently fail if points can't be awarded (idempotency check may fail)
    }

    return serializeFeedPost(post) as unknown as FeedPost;
  }

  /**
   * Get global feed posts
   */
  async getFeedPosts(options: {
    limit?: number;
    offset?: number;
    userId?: string; // For checking if user liked/saved posts
  }) {
    const { limit = 20, offset = 0, userId } = options;

    const posts = await db.feedPost.findMany({
      where: {
        status: 'VISIBLE',
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            trustScore: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        vendor: {
          include: {
            location: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
        media: {
          include: {
            media: true,
          },
        },
        interactions: userId ? {
          where: {
            userId,
          },
        } : false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Transform posts to include isLiked and isSaved flags
    return posts.map((post) => {
      const interactions = userId && post.interactions ? post.interactions : [];
      const isLiked = interactions.some((i) => i.interactionType === 'LIKE');
      const isSaved = interactions.some((i) => i.interactionType === 'SAVE');

      return serializeFeedPost({
        ...post,
        isLiked,
        isSaved,
      });
    });
  }

  /**
   * Get following feed (posts from users the current user follows)
   */
  async getFollowingFeed(userId: string, options: { limit?: number; offset?: number }) {
    const { limit = 20, offset = 0 } = options;

    // Get users that current user follows
    const following = await db.follower.findMany({
      where: {
        followerId: userId,
      },
      select: {
        followingId: true,
      },
    });

    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return [];
    }

    const posts = await db.feedPost.findMany({
      where: {
        status: 'VISIBLE',
        authorId: {
          in: followingIds,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            trustScore: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        vendor: {
          include: {
            location: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
        media: {
          include: {
            media: true,
          },
        },
        interactions: {
          where: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Transform posts to include isLiked and isSaved flags
    return posts.map((post) => {
      const interactions = post.interactions || [];
      const isLiked = interactions.some((i) => i.interactionType === 'LIKE');
      const isSaved = interactions.some((i) => i.interactionType === 'SAVE');

      return serializeFeedPost({
        ...post,
        isLiked,
        isSaved,
      });
    });
  }

  /**
   * Get posts by a specific user
   */
  async getUserPosts(
    userId: string,
    options: { limit?: number; offset?: number; viewerId?: string }
  ) {
    const { limit = 20, offset = 0, viewerId } = options;

    const posts = await db.feedPost.findMany({
      where: {
        authorId: userId,
        status: 'VISIBLE',
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            trustScore: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        vendor: {
          include: {
            location: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
        media: {
          include: {
            media: true,
          },
        },
        interactions: {
          where: {
            userId: viewerId ?? '',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return posts.map((post) => {
      const interactions = post.interactions || [];
      const isLiked = interactions.some((i) => i.interactionType === 'LIKE');
      const isSaved = interactions.some((i) => i.interactionType === 'SAVE');

      return serializeFeedPost({
        ...post,
        isLiked,
        isSaved,
      });
    });
  }

  /**
   * Like or unlike a post
   */
  async toggleLike(postId: string, userId: string) {
    // Check if post exists
    const post = await db.feedPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check if user already liked the post
    const existingLike = await db.feedInteraction.findUnique({
      where: {
        postId_userId_interactionType: {
          postId,
          userId,
          interactionType: 'LIKE',
        },
      },
    });

    if (existingLike) {
      // Unlike: delete interaction and decrement like count
      await db.$transaction([
        db.feedInteraction.delete({
          where: {
            id: existingLike.id,
          },
        }),
        db.feedPost.update({
          where: { id: postId },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      // Get updated post
      const updatedPost = await db.feedPost.findUnique({
        where: { id: postId },
      });

      return {
        isLiked: false,
        likeCount: updatedPost!.likeCount,
      };
    } else {
      // Like: create interaction and increment like count
      await db.$transaction([
        db.feedInteraction.create({
          data: {
            postId,
            userId,
            interactionType: 'LIKE',
          },
        }),
        db.feedPost.update({
          where: { id: postId },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        }),
      ]);

      // Get updated post
      const updatedPost = await db.feedPost.findUnique({
        where: { id: postId },
      });

      // Award points for liking the post
      try {
        await walletService.awardLikeBonus(userId, postId);
      } catch {
        // Silently fail if points can't be awarded
      }

      return {
        isLiked: true,
        likeCount: updatedPost!.likeCount,
        pointsEarned: 2, // Include points earned for UI feedback
      };
    }
  }

  /**
   * Save or unsave a post
   */
  async toggleSave(postId: string, userId: string) {
    // Check if post exists
    const post = await db.feedPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check if user already saved the post
    const existingSave = await db.feedInteraction.findUnique({
      where: {
        postId_userId_interactionType: {
          postId,
          userId,
          interactionType: 'SAVE',
        },
      },
    });

    if (existingSave) {
      // Unsave: delete interaction
      await db.feedInteraction.delete({
        where: {
          id: existingSave.id,
        },
      });

      return {
        isSaved: false,
      };
    } else {
      // Save: create interaction
      await db.feedInteraction.create({
        data: {
          postId,
          userId,
          interactionType: 'SAVE',
        },
      });

      return {
        isSaved: true,
      };
    }
  }

  /**
   * Get comments for a post
   */
  async getComments(postId: string) {
    const post = await db.feedPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const comments = await db.comment.findMany({
      where: {
        postId,
        status: 'VISIBLE',
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            trustScore: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return comments.map(serializeComment);
  }

  /**
   * Add a comment to a post
   */
  async addComment(input: AddCommentInput): Promise<Comment> {
    const { authorId, postId, body } = input;

    if (!body || body.trim().length === 0) {
      throw new ValidationError('Comment body cannot be empty');
    }

    // Check if post exists
    const post = await db.feedPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Create comment and increment comment count
    const [comment] = await db.$transaction([
      db.comment.create({
        data: {
          postId,
          authorId,
          body: body.trim(),
          status: 'VISIBLE',
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              trustScore: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      db.feedPost.update({
        where: { id: postId },
        data: {
          commentCount: {
            increment: 1,
          },
        },
      }),
    ]);

    // Award points for commenting
    try {
      await walletService.awardCommentBonus(authorId, comment.id);
    } catch {
      // Silently fail if points can't be awarded
    }

    return serializeComment(comment) as unknown as Comment;
  }

  /**
   * Get a single post by ID
   */
  async getPostById(postId: string, userId?: string) {
    const post = await db.feedPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            trustScore: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        vendor: {
          include: {
            location: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
        media: {
          include: {
            media: true,
          },
        },
        interactions: userId ? {
          where: {
            userId,
          },
        } : false,
      },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const interactions = userId && post.interactions ? post.interactions : [];
    const isLiked = interactions.some((i) => i.interactionType === 'LIKE');
    const isSaved = interactions.some((i) => i.interactionType === 'SAVE');

    return serializeFeedPost({
      ...post,
      isLiked,
      isSaved,
    });
  }
}
