import { z } from 'zod';

export const createCommentSchema = z.object({
  post_id: z.string().uuid(),
  content: z.string().min(1).max(500),
  parent_comment_id: z.string().uuid().optional(),
  reply_to_user_id: z.string().uuid().optional(),
  mentions: z.array(z.string()).max(10).optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(500),
  mentions: z.array(z.string()).max(10).optional(),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const getCommentsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('oldest'),
});

export type GetCommentsQuery = z.infer<typeof getCommentsQuery>;

export const reportCommentSchema = z.object({
  reason: z.enum([
    'SPAM',
    'INAPPROPRIATE',
    'HARASSMENT',
    'MISINFORMATION',
    'OTHER',
  ]),
  description: z.string().max(500).optional(),
});

export type ReportCommentInput = z.infer<typeof reportCommentSchema>;
