import { Router, Request, Response } from 'express';
import { VendorService } from '../services/vendor.service';
import { db } from '../config/database';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { serializeMenuItem, serializeVendor } from '../utils/serializers';
import { TagCategory } from '@prisma/client';

const router = Router();
const vendorService = new VendorService();

/**
 * GET /api/v1/vendors/nearby
 * Search for vendors near coordinates
 */
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radiusKm, radius, limit, offset, tagIds } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'latitude and longitude are required',
      });
    }

    const parsedRadiusKm =
      typeof radiusKm !== 'undefined'
        ? Number(radiusKm)
        : typeof radius !== 'undefined'
          ? Number(radius) / 1000
          : 5;

    const tags = typeof tagIds === 'string' && tagIds.length > 0 ? tagIds.split(',') : undefined;

    const vendors = await vendorService.findNearby({
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusKm: parsedRadiusKm,
      limit: typeof limit !== 'undefined' ? Number(limit) : undefined,
      offset: typeof offset !== 'undefined' ? Number(offset) : undefined,
      tags,
    });

    res.json({
      status: 'success',
      data: {
        vendors,
        count: vendors.length,
        message: vendors.length === 0 ? 'No vendors found in this area yet.' : undefined,
      },
    });
  } catch (error: unknown) {
    logger.error('Error finding nearby vendors', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to search vendors';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/vendors/search
 * Search vendors by name/description
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, city, limit, offset } = req.query;

    if (!q) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query "q" is required',
      });
    }

    const vendors = await vendorService.searchVendors(q as string, {
      city: city as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    const serialized = vendors.map((v: unknown) => {
      // service returns a flattened object already
      const asObj = (value: unknown): Record<string, unknown> =>
        typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

      const obj = asObj(v);
      const tags = Array.isArray(obj.tags)
        ? (obj.tags as unknown[]).map((t) => {
            const tobj = asObj(t);
            return { ...tobj, category: String(tobj.category).toLowerCase() };
          })
        : undefined;

      const distanceKm = typeof obj.distance_km === 'number' ? obj.distance_km : undefined;
      return {
        ...obj,
        tags,
        distanceMeters: typeof distanceKm === 'number' ? distanceKm * 1000 : undefined,
      };
    });

    res.json({
      status: 'success',
      data: {
        vendors: serialized,
        count: serialized.length,
        message: vendors.length === 0 ? 'No vendors found.' : undefined,
      },
    });
  } catch (error: unknown) {
    logger.error('Error searching vendors', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to search vendors';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/vendors/by-category
 * Filter vendors by tag category
 */
router.get('/by-category', async (req: Request, res: Response) => {
  try {
    const { category, limit, offset } = req.query;
    if (typeof category !== 'string' || category.length === 0) {
      return res.status(400).json({ status: 'error', message: 'category is required' });
    }

    const vendors = await db.vendor.findMany({
      where: {
        status: 'ACTIVE',
        tags: {
          some: {
            tag: { category: category.toUpperCase() as TagCategory },
          },
        },
      },
      include: {
        location: true,
        tags: { include: { tag: true } },
        operationalInfo: true,
      },
      take: limit ? Number(limit) : 50,
      skip: offset ? Number(offset) : 0,
      orderBy: [{ isVerified: 'desc' }, { popularityScore: 'desc' }],
    });

    res.json({
      status: 'success',
      data: {
        vendors: vendors.map((v) => serializeVendor(v)),
      },
    });
  } catch (error: unknown) {
    logger.error('Error fetching vendors by category', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch vendors';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/vendors/by-tag
 * Filter vendors by tagId
 */
router.get('/by-tag', async (req: Request, res: Response) => {
  try {
    const { tagId, limit, offset } = req.query;
    if (typeof tagId !== 'string' || tagId.length === 0) {
      return res.status(400).json({ status: 'error', message: 'tagId is required' });
    }

    const vendors = await db.vendor.findMany({
      where: {
        status: 'ACTIVE',
        tags: { some: { tagId } },
      },
      include: {
        location: true,
        tags: { include: { tag: true } },
        operationalInfo: true,
      },
      take: limit ? Number(limit) : 50,
      skip: offset ? Number(offset) : 0,
      orderBy: [{ isVerified: 'desc' }, { popularityScore: 'desc' }],
    });

    res.json({
      status: 'success',
      data: {
        vendors: vendors.map((v) => serializeVendor(v)),
      },
    });
  } catch (error: unknown) {
    logger.error('Error fetching vendors by tag', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch vendors';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/vendors
 * List all vendors or filter by query params
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radiusKm = 20 } = req.query;

    if (latitude && longitude) {
      const vendors = await vendorService.findNearby({
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusKm: Number(radiusKm),
      });

      return res.json({
        status: 'success',
        data: {
          vendors,
          count: vendors.length,
        },
      });
    }

    // Default: return featured vendors
    const vendors = await vendorService.getFeatured();
    res.json({
      status: 'success',
      data: {
        vendors: vendors.map((v) => serializeVendor(v)),
        count: vendors.length,
      },
    });
  } catch (error: unknown) {
    logger.error('Error fetching vendors', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch vendors';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/vendors/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const vendor = await db.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        tags: { include: { tag: true } },
        operationalInfo: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({ status: 'error', message: 'Vendor not found' });
    }

    res.json({
      status: 'success',
      data: serializeVendor(vendor),
    });
  } catch (error: unknown) {
    logger.error('Error fetching vendor', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch vendor';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/vendors/:id/menu
 */
router.get('/:id/menu', async (req: Request, res: Response) => {
  try {
    const vendorId = req.params.id;
    const menuItems = await db.menuItem.findMany({
      where: { vendorId, isAvailable: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 500,
    });

    res.json({
      status: 'success',
      data: {
        menuItems: menuItems.map(serializeMenuItem),
      },
    });
  } catch (error: unknown) {
    logger.error('Error fetching vendor menu', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch menu';
    res.status(statusCode).json({ status: 'error', message });
  }
});

export default router;
