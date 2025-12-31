import { db } from '../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

export interface NearbyVendorsQuery {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  tags?: string[];
  priceBands?: string[];
  limit?: number;
  offset?: number;
}

export class VendorService {
  /**
   * Find vendors near coordinates using PostGIS
   */
  async findNearby(query: NearbyVendorsQuery) {
    const {
      latitude,
      longitude,
      radiusKm = 5,
      tags = [],
      priceBands = [],
      limit = 20,
      offset = 0,
    } = query;

    const radiusMeters = radiusKm * 1000;

    // Build the SQL query with PostGIS
    const sql = Prisma.sql`
      SELECT 
        v.id,
        v.name,
        v.description,
        v.price_band as "priceBand",
        v.is_verified as "isVerified",
        v.popularity_score as "popularityScore",
        v.status,
        l.latitude,
        l.longitude,
        l.city,
        l.area,
        l.full_address as "fullAddress",
        ST_Distance(
          l.geom,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) as distance_meters
      FROM vendors v
      INNER JOIN locations l ON l.id = v.location_id
      WHERE v.status = 'ACTIVE'
        AND ST_DWithin(
          l.geom,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${radiusMeters}
        )
        ${tags.length > 0 ? Prisma.sql`
          AND v.id IN (
            SELECT vendor_id FROM vendor_tags
            WHERE tag_id IN (${Prisma.join(tags)})
          )
        ` : Prisma.empty}
        ${priceBands.length > 0 ? Prisma.sql`
          AND v.price_band IN (${Prisma.join(priceBands)})
        ` : Prisma.empty}
      ORDER BY distance_meters ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const vendors = await db.$queryRaw<any[]>(sql);

    // Get tags for each vendor
    const vendorIds = vendors.map(v => v.id);
    const vendorTags = await db.vendorTag.findMany({
      where: {
        vendorId: { in: vendorIds },
      },
      include: {
        tag: true,
      },
    });

    // Group tags by vendor
    const tagsByVendor = vendorTags.reduce((acc, vt) => {
      if (!acc[vt.vendorId]) {
        acc[vt.vendorId] = [];
      }
      acc[vt.vendorId].push(vt.tag);
      return acc;
    }, {} as Record<string, any[]>);

    // Attach tags to vendors
    const vendorsWithTags = vendors.map(vendor => ({
      ...vendor,
      distance_meters: Number(vendor.distance_meters),
      popularityScore: Number(vendor.popularityScore),
      tags: tagsByVendor[vendor.id] || [],
    }));

    return {
      vendors: vendorsWithTags,
      total: vendorsWithTags.length,
      limit,
      offset,
    };
  }

  /**
   * Get vendor by ID with full details
   */
  async getById(vendorId: string, userId?: string) {
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      include: {
        location: true,
        operationalInfo: true,
        tags: {
          include: {
            tag: true,
          },
        },
        menuItems: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    // Get review stats
    const reviewStats = await db.review.aggregate({
      where: {
        vendorId,
        status: 'VISIBLE',
      },
      _avg: {
        overallScore: true,
      },
      _count: {
        id: true,
      },
    });

    // Check if user has reviewed
    let userReview = null;
    if (userId) {
      userReview = await db.review.findUnique({
        where: {
          userId_vendorId: {
            userId,
            vendorId,
          },
        },
      });
    }

    return {
      ...vendor,
      tags: vendor.tags.map(vt => vt.tag),
      reviewStats: {
        averageScore: reviewStats._avg.overallScore || 0,
        totalReviews: reviewStats._count.id,
      },
      userReview,
    };
  }

  /**
   * Search vendors by name or description
   */
  async search(searchQuery: string, limit: number = 20, offset: number = 0) {
    const vendors = await db.$queryRaw<any[]>`
      SELECT 
        v.id,
        v.name,
        v.description,
        v.price_band as "priceBand",
        v.is_verified as "isVerified",
        v.popularity_score as "popularityScore",
        v.status,
        similarity(v.name, ${searchQuery}) as name_similarity
      FROM vendors v
      WHERE v.status = 'ACTIVE'
        AND (
          v.name ILIKE ${'%' + searchQuery + '%'}
          OR v.description ILIKE ${'%' + searchQuery + '%'}
        )
      ORDER BY name_similarity DESC, v.popularity_score DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return {
      vendors,
      total: vendors.length,
      limit,
      offset,
    };
  }

  /**
   * Get vendor menu
   */
  async getMenu(vendorId: string) {
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    const menuItems = await db.menuItem.findMany({
      where: { vendorId },
      orderBy: { sortOrder: 'asc' },
    });

    return menuItems;
  }

  /**
   * Get featured vendors (highest popularity)
   */
  async getFeatured(limit: number = 10) {
    const vendors = await db.vendor.findMany({
      where: {
        status: 'ACTIVE',
        isVerified: true,
      },
      include: {
        location: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        popularityScore: 'desc',
      },
      take: limit,
    });

    return vendors.map(vendor => ({
      ...vendor,
      tags: vendor.tags.map(vt => vt.tag),
    }));
  }
}

export const vendorService = new VendorService();
