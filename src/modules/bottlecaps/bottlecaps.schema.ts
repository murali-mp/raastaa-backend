import { z } from 'zod';

// ==================== BottleCap Transactions ====================
export const getTransactionsQuery = z.object({
  limit: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  cursor: z.string().optional(),
  action_type: z.enum([
    'DAILY_LOGIN',
    'FIRST_POST',
    'POST',
    'COMMENT',
    'LIKE_RECEIVED',
    'RATING_TEXT',
    'RATING_WITH_PHOTO',
    'EXPEDITION_COMPLETE',
    'EXPEDITION_CREATE',
    'ACHIEVEMENT_UNLOCK',
    'REFERRAL_BONUS',
    'PROFILE_COMPLETE',
    'FIRST_FOLLOW',
    'SPENT',
    'REFUND',
    'ADMIN_GRANT',
    'ADMIN_DEDUCT',
  ]).optional(),
});

export type GetTransactionsQuery = z.infer<typeof getTransactionsQuery>;

// ==================== Daily Claim ====================
export const dailyClaimSchema = z.object({
  streak_day: z.number().int().min(1).max(7).optional(),
});

export type DailyClaimInput = z.infer<typeof dailyClaimSchema>;

// ==================== Spend Bottle Caps ====================
export const spendBottleCapsSchema = z.object({
  amount: z.number().int().positive(),
  item_type: z.enum(['BADGE', 'PROFILE_FRAME', 'BOOST', 'FEATURE_UNLOCK']),
  item_id: z.string().uuid(),
  description: z.string().max(200).optional(),
});

export type SpendBottleCapsInput = z.infer<typeof spendBottleCapsSchema>;

// ==================== Admin Grant/Deduct ====================
export const adminBottleCapsSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
});

export type AdminBottleCapsInput = z.infer<typeof adminBottleCapsSchema>;

// ==================== Leaderboard Query ====================
export const leaderboardQuery = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'all_time']).default('weekly'),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 10),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuery>;
