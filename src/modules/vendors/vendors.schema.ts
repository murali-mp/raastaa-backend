import { z } from 'zod';

const operatingHoursSchema = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  closed: z.boolean().optional(),
});

export const updateVendorProfileSchema = z.object({
  store_description: z.string().max(1000).optional(),
  operating_hours: z.record(z.string(), operatingHoursSchema).optional(),
  upi_id: z.string().optional(),
  food_categories: z.array(z.string()).optional(),
});

export type UpdateVendorProfileInput = z.infer<typeof updateVendorProfileSchema>;

export const getVendorParams = z.object({
  vendorId: z.string().uuid(),
});

export type GetVendorParams = z.infer<typeof getVendorParams>;

export const searchVendorsQuery = z.object({
  q: z.string().min(1).max(50).optional(),
  category: z.string().optional(),
  lat: z.string().regex(/^-?[0-9]+\.?[0-9]*$/).transform(Number).optional(),
  lng: z.string().regex(/^-?[0-9]+\.?[0-9]*$/).transform(Number).optional(),
  radius: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(100).max(50000)).optional(),
  open_now: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  min_rating: z.string().regex(/^[0-5](\.[0-9])?$/).transform(Number).optional(),
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
});

export type SearchVendorsQuery = z.infer<typeof searchVendorsQuery>;

export const getNearbyVendorsQuery = z.object({
  lat: z.string().regex(/^-?[0-9]+\.?[0-9]*$/).transform(Number),
  lng: z.string().regex(/^-?[0-9]+\.?[0-9]*$/).transform(Number),
  radius: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(100).max(50000)).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional(),
});

export type GetNearbyVendorsQuery = z.infer<typeof getNearbyVendorsQuery>;

export const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

export const goLiveSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type GoLiveInput = z.infer<typeof goLiveSchema>;

export const addMenuItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  category: z.string().optional(),
  is_veg: z.boolean().optional(),
  is_available: z.boolean().optional(),
  photo_url: z.string().url().optional(),
});

export type AddMenuItemInput = z.infer<typeof addMenuItemSchema>;

export const updateMenuItemSchema = addMenuItemSchema.partial();

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

export const menuItemParams = z.object({
  itemId: z.string().regex(/^\d+$/).transform(Number),
});

export type MenuItemParams = z.infer<typeof menuItemParams>;

export const getVendorPostsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
});

export type GetVendorPostsQuery = z.infer<typeof getVendorPostsQuery>;

export const getVendorRatingsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional(),
  sort: z.enum(['newest', 'oldest', 'highest', 'lowest']).optional(),
});

export type GetVendorRatingsQuery = z.infer<typeof getVendorRatingsQuery>;
