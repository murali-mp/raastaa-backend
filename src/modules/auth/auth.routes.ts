import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middleware/validator';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';
import {
  registerUserSchema,
  registerVendorSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from './auth.schema';

const router = Router();

// OTP routes (primary auth method)
router.post(
  '/request-otp',
  authLimiter,
  validateBody(requestOtpSchema),
  authController.requestOtp.bind(authController)
);

router.post(
  '/verify-otp',
  authLimiter,
  validateBody(verifyOtpSchema),
  authController.verifyOtp.bind(authController)
);

// Public routes with rate limiting
router.post(
  '/register/user',
  authLimiter,
  validateBody(registerUserSchema),
  authController.registerUser.bind(authController)
);

router.post(
  '/register/vendor',
  authLimiter,
  validateBody(registerVendorSchema),
  authController.registerVendor.bind(authController)
);

router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  authController.login.bind(authController)
);

router.post(
  '/refresh',
  authLimiter,
  validateBody(refreshTokenSchema),
  authController.refreshToken.bind(authController)
);

router.post('/logout', authController.logout.bind(authController));

// Availability check routes
router.get('/check/username/:username', authController.checkUsername.bind(authController));
router.get('/check/email', authController.checkEmail.bind(authController));
router.get('/check/phone', authController.checkPhone.bind(authController));

// Protected routes
router.get('/me', authenticate, authController.getMe.bind(authController));

router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword.bind(authController)
);

export default router;
