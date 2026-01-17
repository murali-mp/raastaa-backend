import { z } from 'zod';

export const updateProfileSchema = z.object({
  display_name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  food_preferences: z.array(z.string()).optional(),
  push_enabled: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  location_sharing: z.boolean().optional(),
  fcm_token: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const getUserParams = z.object({
  userId: z.string().uuid(),
});

export type GetUserParams = z.infer<typeof getUserParams>;

export const getUsernameParams = z.object({
  username: z.string(),
});

export const searchUsersQuery = z.object({
  q: z.string().min(1).max(50),
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
});

export type SearchUsersQuery = z.infer<typeof searchUsersQuery>;

export const getUserPostsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
});

export type GetUserPostsQuery = z.infer<typeof getUserPostsQuery>;

export const getReferralStatsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
});

export type GetReferralStatsQuery = z.infer<typeof getReferralStatsQuery>;

export const getBottleCapsHistoryQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
  type: z.enum(['earned', 'spent', 'all']).optional(),
});

export type GetBottleCapsHistoryQuery = z.infer<typeof getBottleCapsHistoryQuery>;

export const blockUserSchema = z.object({
  user_id: z.string().uuid(),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;
