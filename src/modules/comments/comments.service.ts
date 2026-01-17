import { prisma } from '../../config/database';
import { DEFAULT_PAGE_SIZE, BOTTLE_CAP_REWARDS, DAILY_CAPS, CACHE_KEYS } from '../../utils/constants';
import { redis } from '../../config/redis';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { extractMentions } from '../../utils/helpers';
import { adminNotifications } from '../../utils/discord';
import {
  CreateCommentInput,
  UpdateCommentInput,
  GetCommentsQuery,
  ReportCommentInput,
} from './comments.schema';

export class CommentsService {
  /**
   * Create a comment on a post
   */
  async createComment(authorId: string, input: CreateCommentInput) {
    // Get post and verify it exists
    const post = await prisma.post.findUnique({
      where: { uuid: input.post_id },
    });

    if (!post || post.status !== 'ACTIVE') {
      throw new Error('Post not found');
    }

    // If replying to a comment, verify it exists
    if (input.parent_comment_id) {
      const parentComment = await prisma.comment.findUnique({
        where: { uuid: input.parent_comment_id },
      });
      if (!parentComment || parentComment.status !== 'ACTIVE') {
        throw new Error('Parent comment not found');
      }
    }

    // Extract mentions from content if not provided
    const mentions = input.mentions || extractMentions(input.content);

    const comment = await prisma.comment.create({
      data: {
        post_id: input.post_id,
        author_id: authorId,
        content: input.content,
        parent_comment_id: input.parent_comment_id,
        reply_to_user_id: input.reply_to_user_id,
        mentions,
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
      },
    });

    // Update post comment count
    await prisma.post.update({
      where: { uuid: input.post_id },
      data: { comments_count: { increment: 1 } },
    });

    // Award bottle caps for commenting (with daily limit)
    await this.awardCommentCaps(authorId);

    // Notify post author (if not self-comment)
    if (post.author_id !== authorId) {
      await prisma.notification.create({
        data: {
          user_id: post.author_id,
          type: 'COMMENT',
          title: 'New Comment',
          body: 'Someone commented on your post',
          data: { post_id: input.post_id, comment_id: comment.uuid, commenter_id: authorId },
        },
      });
    }

    // Notify replied-to user
    if (input.reply_to_user_id && input.reply_to_user_id !== authorId) {
      await prisma.notification.create({
        data: {
          user_id: input.reply_to_user_id,
          type: 'REPLY',
          title: 'New Reply',
          body: 'Someone replied to your comment',
          data: { post_id: input.post_id, comment_id: comment.uuid, replier_id: authorId },
        },
      });
    }

    // Notify mentioned users
    if (mentions.length > 0) {
      await this.notifyMentionedUsers(authorId, comment.uuid, input.post_id, mentions);
    }

    return {
      ...comment,
      is_liked: false,
    };
  }

  /**
   * Get comments for a post
   */
  async getComments(postId: string, viewerId: string | undefined, query: GetCommentsQuery) {
    const { limit = DEFAULT_PAGE_SIZE, cursor, sort = 'oldest' } = query;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const comments = await prisma.comment.findMany({
      where: {
        post_id: postId,
        status: 'ACTIVE',
        parent_comment_id: null, // Only top-level comments
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
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { uuid: decodedCursor },
      }),
      orderBy: { created_at: sort === 'newest' ? 'desc' : 'asc' },
    });

    // Get like statuses for viewer
    let likedSet = new Set<string>();
    if (viewerId) {
      const commentIds = comments.map((c) => c.uuid);
      const likedComments = await prisma.like.findMany({
        where: {
          user_id: viewerId,
          target_type: 'COMMENT',
          target_id: { in: commentIds },
        },
      });
      likedSet = new Set(likedComments.map((l) => l.target_id));
    }

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, -1) : comments;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      items: items.map((comment) => ({
        ...comment,
        is_liked: likedSet.has(comment.uuid),
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get replies to a comment
   */
  async getReplies(commentId: string, viewerId: string | undefined, limit = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const replies = await prisma.comment.findMany({
      where: {
        parent_comment_id: commentId,
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
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { uuid: decodedCursor },
      }),
      orderBy: { created_at: 'asc' },
    });

    // Get like statuses for viewer
    let likedSet = new Set<string>();
    if (viewerId) {
      const replyIds = replies.map((r) => r.uuid);
      const likedReplies = await prisma.like.findMany({
        where: {
          user_id: viewerId,
          target_type: 'COMMENT',
          target_id: { in: replyIds },
        },
      });
      likedSet = new Set(likedReplies.map((l) => l.target_id));
    }

    const hasMore = replies.length > limit;
    const items = hasMore ? replies.slice(0, -1) : replies;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      items: items.map((reply) => ({
        ...reply,
        is_liked: likedSet.has(reply.uuid),
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, authorId: string, input: UpdateCommentInput) {
    const comment = await prisma.comment.findUnique({
      where: { uuid: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.author_id !== authorId) {
      throw new Error('Not authorized to edit this comment');
    }

    // Re-extract mentions if content changed
    const mentions = input.mentions || extractMentions(input.content);

    const updatedComment = await prisma.comment.update({
      where: { uuid: commentId },
      data: {
        content: input.content,
        mentions,
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
      },
    });

    return updatedComment;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string, authorId: string) {
    const comment = await prisma.comment.findUnique({
      where: { uuid: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.author_id !== authorId) {
      throw new Error('Not authorized to delete this comment');
    }

    await prisma.$transaction([
      prisma.comment.update({
        where: { uuid: commentId },
        data: { status: 'DELETED' },
      }),
      prisma.post.update({
        where: { uuid: comment.post_id },
        data: { comments_count: { decrement: 1 } },
      }),
    ]);

    return { deleted: true };
  }

  /**
   * Like a comment
   */
  async likeComment(userId: string, commentId: string) {
    const comment = await prisma.comment.findUnique({
      where: { uuid: commentId },
    });

    if (!comment || comment.status !== 'ACTIVE') {
      throw new Error('Comment not found');
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: 'COMMENT',
          target_id: commentId,
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
          target_type: 'COMMENT',
          target_id: commentId,
        },
      }),
      prisma.comment.update({
        where: { uuid: commentId },
        data: { likes_count: { increment: 1 } },
      }),
    ]);

    // Create notification for comment author (if not self-like)
    if (comment.author_id !== userId) {
      await prisma.notification.create({
        data: {
          user_id: comment.author_id,
          type: 'LIKE',
          title: 'Comment Liked',
          body: 'Someone liked your comment',
          data: { comment_id: commentId, liker_id: userId },
        },
      });
    }

    return { liked: true };
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(userId: string, commentId: string) {
    const existingLike = await prisma.like.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: 'COMMENT',
          target_id: commentId,
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
            target_type: 'COMMENT',
            target_id: commentId,
          },
        },
      }),
      prisma.comment.update({
        where: { uuid: commentId },
        data: { likes_count: { decrement: 1 } },
      }),
    ]);

    return { unliked: true };
  }

  /**
   * Report a comment
   */
  async reportComment(userId: string, commentId: string, input: ReportCommentInput) {
    const comment = await prisma.comment.findUnique({
      where: { uuid: commentId },
      include: { author: { select: { username: true } } },
    });

    if (!comment || comment.status === 'DELETED') {
      throw new Error('Comment not found');
    }

    // Check for duplicate report
    const existingReport = await prisma.contentFlag.findFirst({
      where: {
        reporter_id: userId,
        target_type: 'COMMENT',
        target_id: commentId,
        status: { in: ['PENDING', 'REVIEWED'] },
      },
    });

    if (existingReport) {
      return { already_reported: true };
    }

    const report = await prisma.contentFlag.create({
      data: {
        reporter_id: userId,
        target_type: 'COMMENT',
        target_id: commentId,
        reason: input.reason,
        details: input.description,
      },
    });

    // Flag comment if multiple reports
    const reportCount = await prisma.contentFlag.count({
      where: {
        target_type: 'COMMENT',
        target_id: commentId,
        status: { in: ['PENDING', 'REVIEWED'] },
      },
    });

    if (reportCount >= 3) {
      await prisma.comment.update({
        where: { uuid: commentId },
        data: { status: 'FLAGGED' },
      });
    }

    // Notify admins
    await adminNotifications.contentReport(
      comment.author?.username || 'Unknown',
      'COMMENT',
      input.reason,
      input.description
    );

    return { reported: true, report_id: report.id };
  }

  // ==================== Private Methods ====================

  /**
   * Award bottle caps for commenting (with daily limit)
   */
  private async awardCommentCaps(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${CACHE_KEYS.USER_DAILY_ACTIONS}:${userId}:comments:${today}`;

    const count = await redis.incr(cacheKey);
    if (count === 1) {
      await redis.expire(cacheKey, 86400); // 24 hours
    }

    if (count <= DAILY_CAPS.COMMENTS) {
      const user = await prisma.user.update({
        where: { uuid: userId },
        data: { bottle_caps: { increment: BOTTLE_CAP_REWARDS.COMMENT } },
      });

      await prisma.bottleCapTransaction.create({
        data: {
          user_id: userId,
          amount: BOTTLE_CAP_REWARDS.COMMENT,
          action_type: 'COMMENT',
          reference_type: 'COMMENT',
          description: `Daily comment reward (${count}/${DAILY_CAPS.COMMENTS})`,
          balance_after: user.bottle_caps,
        },
      });
    }
  }

  /**
   * Notify mentioned users in a comment
   */
  private async notifyMentionedUsers(authorId: string, commentId: string, postId: string, mentions: string[]) {
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
          body: 'Someone mentioned you in a comment',
          data: { post_id: postId, comment_id: commentId, mentioner_id: authorId },
        },
      });
    }
  }
}

export const commentsService = new CommentsService();
