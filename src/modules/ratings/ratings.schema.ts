import { z } from 'zod';

export const createRatingSchema = z.object({
  vendor_id: z.string().uuid(),
  expedition_id: z.string().uuid().optional(),
  hygiene: z.number().int().min(1).max(5),
  value_for_money: z.number().int().min(1).max(5),
  taste: z.number().int().min(1).max(5),
  recommendation: z.number().int().min(1).max(5),
  review_text: z.string().max(1000).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;

export const updateRatingSchema = z.object({
  hygiene: z.number().int().min(1).max(5).optional(),
  value_for_money: z.number().int().min(1).max(5).optional(),
  taste: z.number().int().min(1).max(5).optional(),
  recommendation: z.number().int().min(1).max(5).optional(),
  review_text: z.string().max(1000).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

export type UpdateRatingInput = z.infer<typeof updateRatingSchema>;

export const getRatingsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  sort: z.enum(['newest', 'oldest', 'highest', 'lowest']).optional().default('newest'),
});

export type GetRatingsQuery = z.infer<typeof getRatingsQuery>;

export const markHelpfulSchema = z.object({
  helpful: z.boolean(),
});

export type MarkHelpfulInput = z.infer<typeof markHelpfulSchema>;

export const reportRatingSchema = z.object({
  reason: z.enum([
    'SPAM',
    'INAPPROPRIATE',
    'FAKE_REVIEW',
    'HARASSMENT',
    'OTHER',
  ]),
  description: z.string().max(500).optional(),
});

export type ReportRatingInput = z.infer<typeof reportRatingSchema>;
