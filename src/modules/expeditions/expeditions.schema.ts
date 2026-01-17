import { z } from 'zod';

export const createExpeditionSchema = z.object({
  type: z.enum(['SOLO', 'TEAM']),
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  planned_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM').optional(),
  cover_image: z.string().url().optional(),
  max_participants: z.number().int().min(1).max(50).optional().default(10),
  is_public: z.boolean().optional().default(true),
  vendor_ids: z.array(z.string().uuid()).min(1).max(20),
});

export type CreateExpeditionInput = z.infer<typeof createExpeditionSchema>;

export const updateExpeditionSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  planned_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM').optional(),
  cover_image: z.string().url().optional(),
  max_participants: z.number().int().min(1).max(50).optional(),
  is_public: z.boolean().optional(),
});

export type UpdateExpeditionInput = z.infer<typeof updateExpeditionSchema>;

export const addVendorsSchema = z.object({
  vendor_ids: z.array(z.string().uuid()).min(1).max(10),
});

export type AddVendorsInput = z.infer<typeof addVendorsSchema>;

export const reorderVendorsSchema = z.object({
  vendor_order: z.array(z.object({
    vendor_id: z.string().uuid(),
    order_index: z.number().int().min(0),
  })),
});

export type ReorderVendorsInput = z.infer<typeof reorderVendorsSchema>;

export const inviteParticipantsSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1).max(20),
});

export type InviteParticipantsInput = z.infer<typeof inviteParticipantsSchema>;

export const respondInviteSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

export type RespondInviteInput = z.infer<typeof respondInviteSchema>;

export const checkInVendorSchema = z.object({
  vendor_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

export type CheckInVendorInput = z.infer<typeof checkInVendorSchema>;

export const completeExpeditionSchema = z.object({
  total_spent: z.number().positive().optional(),
  distance_walked_meters: z.number().int().positive().optional(),
});

export type CompleteExpeditionInput = z.infer<typeof completeExpeditionSchema>;

export const getExpeditionsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
  status: z.enum(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  type: z.enum(['SOLO', 'TEAM']).optional(),
});

export type GetExpeditionsQuery = z.infer<typeof getExpeditionsQuery>;

export const discoverExpeditionsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type DiscoverExpeditionsQuery = z.infer<typeof discoverExpeditionsQuery>;
