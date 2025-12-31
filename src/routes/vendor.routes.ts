import { Router, Request, Response } from 'express';
import { VendorService } from '../services/vendor.service';

const router = Router();
const vendorService = new VendorService();

/**
 * GET /api/v1/vendors/nearby
 * Search for vendors near coordinates
 */
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radiusKm = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'latitude and longitude are required',
      });
    }

    const vendors = await vendorService.findNearby({
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusKm: Number(radiusKm),
    });

    res.json({
      status: 'success',
      data: {
        vendors,
        count: vendors.length,
        message: vendors.length === 0 ? 'No vendors found in this area yet.' : undefined,
      },
    });
  } catch (error) {
    console.error('Error finding nearby vendors:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search vendors',
    });
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

    res.json({
      status: 'success',
      data: {
        vendors,
        count: vendors.length,
        message: vendors.length === 0 ? 'No vendors found.' : undefined,
      },
    });
  } catch (error) {
    console.error('Error searching vendors:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search vendors',
    });
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
        vendors,
        count: vendors.length,
      },
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch vendors',
    });
  }
});

export default router;
