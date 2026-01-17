import { z } from 'zod';

export const followUserSchema = z.object({
  user_id: z.string().uuid(),
});

export type FollowUserInput = z.infer<typeof followUserSchema>;

export const followVendorSchema = z.object({
  vendor_id: z.string().uuid(),
  notifications: z.boolean().optional(),
});

export type FollowVendorInput = z.infer<typeof followVendorSchema>;

export const friendRequestSchema = z.object({
  user_id: z.string().uuid(),
});

export type FriendRequestInput = z.infer<typeof friendRequestSchema>;

export const respondFriendRequestSchema = z.object({
  request_id: z.string().uuid(),
  action: z.enum(['accept', 'decline']),
});

export type RespondFriendRequestInput = z.infer<typeof respondFriendRequestSchema>;

export const getFollowersQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
});

export type GetFollowersQuery = z.infer<typeof getFollowersQuery>;

export const userIdParams = z.object({
  userId: z.string().uuid(),
});

export const vendorIdParams = z.object({
  vendorId: z.string().uuid(),
});
