import { z } from 'zod';

export const createPostSchema = z.object({
  vendor_id: z.string().uuid().optional(),
  expedition_id: z.string().uuid().optional(),
  content_type: z.enum(['TEXT', 'IMAGE', 'CAROUSEL', 'VIDEO']),
  text_content: z.string().max(2000).optional(),
  media_urls: z.array(z.string().url()).max(10).optional(),
  location_lat: z.number().min(-90).max(90).optional(),
  location_lng: z.number().min(-180).max(180).optional(),
  location_name: z.string().max(200).optional(),
  hashtags: z.array(z.string()).max(30).optional(),
  mentions: z.array(z.string()).max(20).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  text_content: z.string().max(2000).optional(),
  location_lat: z.number().min(-90).max(90).optional(),
  location_lng: z.number().min(-180).max(180).optional(),
  location_name: z.string().max(200).optional(),
  hashtags: z.array(z.string()).max(30).optional(),
  mentions: z.array(z.string()).max(20).optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const getPostParams = z.object({
  postId: z.string().uuid(),
});

export type GetPostParams = z.infer<typeof getPostParams>;

export const getFeedQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
  filter: z.enum(['all', 'friends', 'vendors']).optional(),
});

export type GetFeedQuery = z.infer<typeof getFeedQuery>;

export const getPostsByHashtagQuery = z.object({
  hashtag: z.string().min(1).max(50),
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
});

export type GetPostsByHashtagQuery = z.infer<typeof getPostsByHashtagQuery>;

export const savePostParams = z.object({
  postId: z.string().uuid(),
});

export type SavePostParams = z.infer<typeof savePostParams>;

export const reportPostSchema = z.object({
  reason: z.enum([
    'SPAM',
    'INAPPROPRIATE',
    'HARASSMENT',
    'MISINFORMATION',
    'COPYRIGHT',
    'OTHER',
  ]),
  description: z.string().max(500).optional(),
});

export type ReportPostInput = z.infer<typeof reportPostSchema>;

export const getTrendingHashtagsQuery = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(20)).optional(),
});

export type GetTrendingHashtagsQuery = z.infer<typeof getTrendingHashtagsQuery>;
