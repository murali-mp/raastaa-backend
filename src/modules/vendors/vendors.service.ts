import { prisma } from '../../config/database';
import { redis, redisHelpers } from '../../config/redis';
import { CACHE_KEYS, DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import { uploadToSpaces, getPublicUrl } from '../../config/s3';
import {
  UpdateVendorProfileInput,
  SearchVendorsQuery,
  GetNearbyVendorsQuery,
  UpdateLocationInput,
  GoLiveInput,
  AddMenuItemInput,
  UpdateMenuItemInput,
  GetVendorRatingsQuery,
} from './vendors.schema';

const LIVE_VENDORS_KEY = 'live_vendors';

export class VendorsService {
  async getVendorById(vendorId: string, viewerId?: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { uuid: vendorId },
      include: {
        location: true,
        menuItems: { where: { is_available: true }, orderBy: { category: 'asc' } },
      },
    });

    if (!vendor) return null;

    let isFollowing = false;
    if (viewerId) {
      const follows = await prisma.vendorFollows.findUnique({
        where: {
          user_id_vendor_id: { user_id: viewerId, vendor_id: vendorId },
        },
      });
      isFollowing = !!follows;
    }

    const { password_hash, ...safe } = vendor;
    return { ...safe, is_following: isFollowing };
  }

  async updateProfile(vendorId: string, input: UpdateVendorProfileInput) {
    const vendor = await prisma.vendor.update({
      where: { uuid: vendorId },
      data: input as any,
    });
    await redis.del(CACHE_KEYS.VENDOR_FULL(vendorId));
    const { password_hash, ...safe } = vendor;
    return safe;
  }

  async updateStallPhoto(vendorId: string, file: Buffer, contentType: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { uuid: vendorId },
      select: { stall_photos: true },
    });

    const extension = contentType.split('/')[1] || 'jpg';
    const key = `vendor-photos/${vendorId}-stall-${Date.now()}.${extension}`;
    await uploadToSpaces(key, file, contentType, true);
    const url = getPublicUrl(key);
    const updatedPhotos = [...(vendor?.stall_photos || []), url];

    await prisma.vendor.update({
      where: { uuid: vendorId },
      data: { stall_photos: updatedPhotos },
    });
    await redis.del(CACHE_KEYS.VENDOR_FULL(vendorId));
    return { stall_photos: updatedPhotos };
  }

  async searchVendors(query: SearchVendorsQuery) {
    const limit = query.limit || DEFAULT_PAGE_SIZE;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;

    const whereClause: any = {};
    if (query.q) {
      whereClause.OR = [
        { store_name: { contains: query.q, mode: 'insensitive' } },
        { vendor_name: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.category) {
      whereClause.food_categories = { has: query.category };
    }
    if (query.min_rating) {
      whereClause.rating_overall = { gte: query.min_rating };
    }

    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      select: {
        uuid: true,
        store_name: true,
        vendor_name: true,
        stall_photos: true,
        rating_overall: true,
        total_ratings: true,
        verification_status: true,
        is_currently_open: true,
        primary_lat: true,
        primary_lng: true,
        food_categories: true,
      },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { uuid: cursor } }),
      orderBy: { rating_overall: 'desc' },
    });

    const hasMore = vendors.length > limit;
    const items = hasMore ? vendors.slice(0, -1) : vendors;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.uuid) : null;

    return { items, nextCursor, hasMore };
  }

  async getNearbyVendors(query: GetNearbyVendorsQuery) {
    const radius = query.radius || 1000;
    const limit = query.limit || 20;

    const nearbyIds = await redisHelpers.geoRadius(
      LIVE_VENDORS_KEY,
      query.lng,
      query.lat,
      radius,
      'm'
    );

    if (nearbyIds.length === 0) {
      return { items: [], hasMore: false };
    }

    const vendorIds = nearbyIds
      .filter((_item: any, i: number) => i % 3 === 0)
      .slice(0, limit) as string[];

    const vendors = await prisma.vendor.findMany({
      where: { uuid: { in: vendorIds } },
      select: {
        uuid: true,
        store_name: true,
        vendor_name: true,
        stall_photos: true,
        rating_overall: true,
        verification_status: true,
        is_currently_open: true,
        primary_lat: true,
        primary_lng: true,
        location: true,
      },
    });

    return { items: vendors, hasMore: false };
  }

  async updateLocation(vendorId: string, input: UpdateLocationInput) {
    await prisma.vendorLocation.upsert({
      where: { vendor_id: vendorId },
      create: {
        vendor_id: vendorId,
        lat: input.lat,
        lng: input.lng,
        is_active: true,
      },
      update: {
        lat: input.lat,
        lng: input.lng,
        is_active: true,
      },
    });

    await redisHelpers.geoAdd(LIVE_VENDORS_KEY, input.lng, input.lat, vendorId);
    return { updated: true };
  }

  async goLive(vendorId: string, input: GoLiveInput) {
    await prisma.$transaction([
      prisma.vendor.update({
        where: { uuid: vendorId },
        data: { is_currently_open: true },
      }),
      prisma.vendorLocation.upsert({
        where: { vendor_id: vendorId },
        create: {
          vendor_id: vendorId,
          lat: input.lat,
          lng: input.lng,
          is_active: true,
        },
        update: {
          lat: input.lat,
          lng: input.lng,
          is_active: true,
        },
      }),
    ]);

    await redisHelpers.geoAdd(LIVE_VENDORS_KEY, input.lng, input.lat, vendorId);
    return { is_live: true };
  }

  async goOffline(vendorId: string) {
    await prisma.vendor.update({
      where: { uuid: vendorId },
      data: { is_currently_open: false },
    });
    await redis.zrem(LIVE_VENDORS_KEY, vendorId);
    return { is_live: false };
  }

  async addMenuItem(vendorId: string, input: AddMenuItemInput) {
    const item = await prisma.menuItem.create({
      data: { vendor_id: vendorId, ...input },
    });
    return item;
  }

  async updateMenuItem(vendorId: string, itemId: string, input: UpdateMenuItemInput) {
    const item = await prisma.menuItem.findFirst({
      where: { uuid: itemId, vendor_id: vendorId },
    });
    if (!item) throw new Error('Menu item not found');

    const updated = await prisma.menuItem.update({
      where: { uuid: itemId },
      data: input,
    });
    return updated;
  }

  async deleteMenuItem(vendorId: string, itemId: string) {
    const item = await prisma.menuItem.findFirst({
      where: { uuid: itemId, vendor_id: vendorId },
    });
    if (!item) throw new Error('Menu item not found');

    await prisma.menuItem.delete({ where: { uuid: itemId } });
    return { deleted: true };
  }

  async getVendorPosts(vendorId: string, limit: number = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const posts = await prisma.post.findMany({
      where: { vendor_id: vendorId, status: 'PUBLISHED' },
      include: {
        author: {
          select: { uuid: true, username: true, display_name: true, profile_picture: true },
        },
      },
      take: limit + 1,
      ...(decodedCursor && { skip: 1, cursor: { uuid: decodedCursor } }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.uuid) : null;

    return { items, nextCursor, hasMore };
  }

  async getVendorRatings(vendorId: string, query: GetVendorRatingsQuery) {
    const limit = query.limit || DEFAULT_PAGE_SIZE;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;

    const ratings = await prisma.rating.findMany({
      where: { vendor_id: vendorId },
      include: {
        user: {
          select: { uuid: true, username: true, display_name: true, profile_picture: true },
        },
      },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { uuid: cursor } }),
      orderBy: { created_at: 'desc' },
    });

    const hasMore = ratings.length > limit;
    const items = hasMore ? ratings.slice(0, -1) : ratings;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.uuid) : null;

    return { items, nextCursor, hasMore };
  }

  async getRatingDistribution(vendorId: string) {
    const ratings = await prisma.rating.findMany({
      where: { vendor_id: vendorId },
      select: { recommendation: true },
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) {
      const rounded = Math.round(r.recommendation);
      if (rounded >= 1 && rounded <= 5) {
        distribution[rounded] = (distribution[rounded] ?? 0) + 1;
      }
    }

    return { distribution, total: ratings.length };
  }

  async getFollowers(vendorId: string, limit: number = DEFAULT_PAGE_SIZE, cursor?: string) {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const followers = await prisma.vendorFollows.findMany({
      where: { vendor_id: vendorId },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { user_id_vendor_id: { user_id: decodedCursor, vendor_id: vendorId } },
      }),
      orderBy: { created_at: 'desc' },
    });

    const userIds = followers.map(f => f.user_id);
    const users = await prisma.user.findMany({
      where: { uuid: { in: userIds } },
      select: { uuid: true, username: true, display_name: true, profile_picture: true },
    });
    const userMap = new Map(users.map(u => [u.uuid, u]));

    const hasMore = followers.length > limit;
    const items = hasMore ? followers.slice(0, -1) : followers;
    const nextCursor = hasMore && items.length > 0 
      ? encodeCursor(items[items.length - 1]!.user_id) : null;

    return {
      items: items.map((f) => ({ ...userMap.get(f.user_id), followed_at: f.created_at })),
      nextCursor,
      hasMore,
    };
  }
}

export const vendorsService = new VendorsService();
