import { db } from '../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { calculateDistance, getBoundingBox } from '../utils/geoUtils';

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
   * Find vendors near coordinates using Haversine distance formula
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

    // Get bounding box for initial filtering (efficient)
    const bbox = getBoundingBox(latitude, longitude, radiusKm);

    // Build where clause
    const where: Prisma.VendorWhereInput = {
      status: 'active',
      location: {
        latitude: {
          gte: bbox.minLat,
          lte: bbox.maxLat,
        },
        longitude: {
          gte: bbox.minLon,
          lte: bbox.maxLon,
        },
      },
    };

    // Add tag filtering if provided
    if (tags.length > 0) {
      where.tags = {
        some: {
          tagId: {
            in: tags,
          },
        },
      };
    }

    // Add price band filtering if provided
    if (priceBands.length > 0) {
      where.priceBand = {
        in: priceBands as any[],
      };
    }

    // Fetch vendors within bounding box
    const vendors = await db.vendor.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            city: true,
            area: true,
            fullAddress: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      take: limit * 2, // Get extra to account for distance filtering
    });

    // Calculate exact distances and filter
    const vendorsWithDistance = vendors
      .map((vendor) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          Number(vendor.location.latitude),
          Number(vendor.location.longitude)
        );

        return {
          ...vendor,
          distance_km: distance,
        };
      })
      .filter((v) => v.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(offset, offset + limit);

    // Transform the response
    return vendorsWithDistance.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      priceBand: v.priceBand,
      isVerified: v.isVerified,
      popularityScore: v.popularityScore,
      status: v.status,
      latitude: v.location.latitude,
      longitude: v.location.longitude,
      city: v.location.city,
      area: v.location.area,
      fullAddress: v.location.fullAddress,
      distance_km: v.distance_km,
      tags: v.tags.map((vt) => ({
        id: vt.tag.id,
        name: vt.tag.name,
        category: vt.tag.category,
      })),
    }));
  }

  /**
   * Find vendors by search query
   */
  async searchVendors(
    query: string,
    options: {
      tags?: string[];
      priceBands?: string[];
      city?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { tags = [], priceBands = [], city, limit = 20, offset = 0 } = options;

    const where: Prisma.VendorWhereInput = {
      status: 'active',
      OR: [
        {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ],
    };

    if (tags.length > 0) {
      where.tags = {
        some: {
          tagId: {
            in: tags,
          },
        },
      };
    }

    if (priceBands.length > 0) {
      where.priceBand = {
        in: priceBands as any[],
      };
    }

    if (city) {
      where.location = {
        city: {
          equals: city,
          mode: 'insensitive',
        },
      };
    }

    const vendors = await db.vendor.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            city: true,
            area: true,
            fullAddress: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      take: limit,
      skip: offset,
      orderBy: [
        { isVerified: 'desc' },
        { popularityScore: 'desc' },
      ],
    });

    return vendors.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      priceBand: v.priceBand,
      isVerified: v.isVerified,
      popularityScore: v.popularityScore,
      status: v.status,
      latitude: v.location.latitude,
      longitude: v.location.longitude,
      city: v.location.city,
      area: v.location.area,
      fullAddress: v.location.fullAddress,
      tags: v.tags.map((vt) => ({
        id: vt.tag.id,
        name: vt.tag.name,
        category: vt.tag.category,
      })),
    }));
  }

  /**
   * Get vendor by ID
   */
  async getById(id: string) {
    const vendor = await db.vendor.findUnique({
      where: { id },
      include: {
        location: true,
        operationalInfo: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    return vendor;
  }

  /**
   * Get featured vendors
   */
  async getFeatured(city?: string, limit: number = 10) {
    const where: Prisma.VendorWhereInput = {
      status: 'active',
      isVerified: true,
    };

    if (city) {
      where.location = {
        city: {
          equals: city,
          mode: 'insensitive',
        },
      };
    }

    return db.vendor.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            city: true,
            area: true,
            fullAddress: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      take: limit,
      orderBy: {
        popularityScore: 'desc',
      },
    });
  }
}
