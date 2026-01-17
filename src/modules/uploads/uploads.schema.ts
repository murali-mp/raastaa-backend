import { z } from 'zod';

// ==================== Presigned URL Request ====================
export const getPresignedUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().regex(/^(image|video)\/(jpeg|jpg|png|gif|webp|mp4|mov|avi|webm)$/i, {
    message: 'Invalid content type. Supported: image (jpeg, jpg, png, gif, webp) or video (mp4, mov, avi, webm)',
  }),
  purpose: z.enum([
    'profile_picture',
    'post_media',
    'vendor_stall_photo',
    'rating_photo',
    'menu_item_photo',
    'expedition_cover',
  ]),
  file_size: z.number().int().positive().max(50 * 1024 * 1024, {
    message: 'File size must be less than 50MB',
  }).optional(),
});

export type GetPresignedUrlInput = z.infer<typeof getPresignedUrlSchema>;

// ==================== Batch Upload ====================
export const batchPresignedUrlSchema = z.object({
  files: z.array(
    z.object({
      filename: z.string().min(1).max(255),
      content_type: z.string().regex(/^(image|video)\/(jpeg|jpg|png|gif|webp|mp4|mov|avi|webm)$/i),
      file_size: z.number().int().positive().max(50 * 1024 * 1024).optional(),
    })
  ).min(1).max(10, { message: 'Maximum 10 files per batch' }),
  purpose: z.enum([
    'post_media',
    'vendor_stall_photo',
    'rating_photo',
    'menu_item_photo',
  ]),
});

export type BatchPresignedUrlInput = z.infer<typeof batchPresignedUrlSchema>;

// ==================== Delete File ====================
export const deleteFileSchema = z.object({
  file_url: z.string().url(),
});

export type DeleteFileInput = z.infer<typeof deleteFileSchema>;

// ==================== Confirm Upload ====================
export const confirmUploadSchema = z.object({
  file_key: z.string().min(1),
  purpose: z.enum([
    'profile_picture',
    'post_media',
    'vendor_stall_photo',
    'rating_photo',
    'menu_item_photo',
    'expedition_cover',
  ]),
  target_id: z.string().uuid().optional(), // For associating with a specific entity
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
