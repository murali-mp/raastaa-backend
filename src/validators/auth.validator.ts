import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional(),
  password: z.string().min(8).max(100),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(100).optional(),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone must be provided',
});

export const loginSchema = z.object({
  emailOrPhone: z.string().min(3),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export const socialAuthSchema = z.object({
  providerUserId: z.string().min(1),
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(100).optional(),
});
