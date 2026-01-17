import { Router } from 'express';
import { uploadsController } from './uploads.controller';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validator';
import {
  getPresignedUrlSchema,
  batchPresignedUrlSchema,
  deleteFileSchema,
} from './uploads.schema';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get presigned URL for single file upload
router.post(
  '/presigned-url',
  validateBody(getPresignedUrlSchema),
  uploadsController.getPresignedUrl
);

// Get presigned URLs for batch upload
router.post(
  '/batch-presigned-urls',
  validateBody(batchPresignedUrlSchema),
  uploadsController.getBatchPresignedUrls
);

// Delete a file
router.delete(
  '/',
  validateBody(deleteFileSchema),
  uploadsController.deleteFile
);

export default router;
