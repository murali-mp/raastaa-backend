import { z } from 'zod';

// ==================== Vendor Approval ====================
export const vendorApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejection_reason: z.string().max(500).optional(),
});

export type VendorApprovalInput = z.infer<typeof vendorApprovalSchema>;

// ==================== Content Moderation ====================
export const contentModerationSchema = z.object({
  action: z.enum(['APPROVE', 'REMOVE', 'WARN']),
  reason: z.string().max(500).optional(),
});

export type ContentModerationInput = z.infer<typeof contentModerationSchema>;

// ==================== User Management ====================
export const userActionSchema = z.object({
  action: z.enum(['SUSPEND', 'UNSUSPEND', 'WARN', 'BAN']),
  reason: z.string().max(500).optional(),
  duration_days: z.number().int().positive().max(365).optional(), // For suspensions
});

export type UserActionInput = z.infer<typeof userActionSchema>;

// ==================== Content Flags Query ====================
export const contentFlagsQuery = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED']).optional(),
  target_type: z.enum(['POST', 'COMMENT', 'RATING', 'USER', 'VENDOR']).optional(),
  limit: z.string().optional().transform((val) => val ? parseInt(val) : 20),
  cursor: z.string().optional(),
});

export type ContentFlagsQuery = z.infer<typeof contentFlagsQuery>;

// ==================== Flag Resolution ====================
export const resolveFlagSchema = z.object({
  action: z.enum(['ACTIONED', 'DISMISSED']),
  admin_notes: z.string().max(1000).optional(),
  content_action: z.enum(['REMOVE', 'WARN', 'IGNORE']).optional(),
});

export type ResolveFlagInput = z.infer<typeof resolveFlagSchema>;

// ==================== Dashboard Query ====================
export const dashboardQuery = z.object({
  period: z.enum(['today', 'week', 'month', 'all']).default('week'),
});

export type DashboardQuery = z.infer<typeof dashboardQuery>;

// ==================== Broadcast Notification ====================
export const broadcastSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  target: z.enum(['all_users', 'all_vendors', 'specific_users']),
  user_ids: z.array(z.string().uuid()).optional(),
});

export type BroadcastInput = z.infer<typeof broadcastSchema>;
