import { Router, Request, Response } from 'express';

const router = Router();

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

    // TODO: Implement vendor search with VendorService
    res.json({
      status: 'success',
      data: {
        vendors: [],
        message: 'No vendors found in this area yet. Add some vendors to the database!',
      },
    });
  } catch (error) {
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
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query "q" is required',
      });
    }

    res.json({
      status: 'success',
      data: {
        vendors: [],
        message: 'No vendors found. Database is empty.',
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to search vendors',
    });
  }
});

export default router;
