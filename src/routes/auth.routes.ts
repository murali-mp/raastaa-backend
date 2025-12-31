import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { authRateLimiter } from '../middlewares/rateLimit.middleware';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  updatePasswordSchema,
  socialAuthSchema,
} from '../validators/auth.validator';

const router = Router();

// Public routes
router.post(
  '/signup',
  authRateLimiter,
  validateBody(signupSchema),
  authController.signup.bind(authController)
);

router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  authController.login.bind(authController)
);

router.post(
  '/refresh',
  validateBody(refreshTokenSchema),
  authController.refresh.bind(authController)
);

router.post(
  '/apple',
  authRateLimiter,
  validateBody(socialAuthSchema),
  authController.appleSignIn.bind(authController)
);

router.post(
  '/google',
  authRateLimiter,
  validateBody(socialAuthSchema),
  authController.googleSignIn.bind(authController)
);

// Protected routes
router.get('/me', authenticate, authController.me.bind(authController));

router.post('/logout', authenticate, authController.logout.bind(authController));

router.put(
  '/password',
  authenticate,
  validateBody(updatePasswordSchema),
  authController.updatePassword.bind(authController)
);

export default router;
