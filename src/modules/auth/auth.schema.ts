import { z } from 'zod';
import { FOOD_CATEGORIES, REFERRAL_SOURCES, VALIDATION_LIMITS } from '../../utils/constants';

// User Registration Schema
export const registerUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number (format: +91XXXXXXXXXX)'),
  username: z
    .string()
    .min(VALIDATION_LIMITS.USERNAME_MIN, `Username must be at least ${VALIDATION_LIMITS.USERNAME_MIN} characters`)
    .max(VALIDATION_LIMITS.USERNAME_MAX, `Username must be at most ${VALIDATION_LIMITS.USERNAME_MAX} characters`)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  display_name: z
    .string()
    .min(VALIDATION_LIMITS.DISPLAY_NAME_MIN)
    .max(VALIDATION_LIMITS.DISPLAY_NAME_MAX),
  dob: z
    .string()
    .datetime()
    .refine(
      (date) => {
        const age = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 365);
        return age >= VALIDATION_LIMITS.MIN_AGE;
      },
      { message: `Must be at least ${VALIDATION_LIMITS.MIN_AGE} years old` }
    ),
  food_preferences: z.array(z.enum(FOOD_CATEGORIES as unknown as [string, ...string[]])).optional(),
  referral_source: z.enum(REFERRAL_SOURCES as unknown as [string, ...string[]]).optional(),
  bio: z.string().max(VALIDATION_LIMITS.BIO_MAX).optional(),
  referral_code: z.string().optional(),
});

// Vendor Registration Schema
export const registerVendorSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+91[6-9]\d{9}$/).optional(),
    password: z.string().min(VALIDATION_LIMITS.PASSWORD_MIN),
    vendor_name: z.string().min(2).max(100),
    store_name: z
      .string()
      .min(VALIDATION_LIMITS.STORE_NAME_MIN)
      .max(VALIDATION_LIMITS.STORE_NAME_MAX),
    store_description: z.string().max(VALIDATION_LIMITS.STORE_DESCRIPTION_MAX),
    operating_hours: z.record(
      z.string(),
      z.object({
        open: z.string().regex(/^\d{2}:\d{2}$/, 'Time format: HH:MM'),
        close: z.string().regex(/^\d{2}:\d{2}$/, 'Time format: HH:MM'),
        is_closed: z.boolean(),
      })
    ),
    upi_id: z.string().regex(/^[\w.-]+@[\w]+$/, 'Invalid UPI ID format'),
    menu_photos: z
      .array(z.string().url())
      .min(VALIDATION_LIMITS.MIN_MENU_PHOTOS)
      .max(VALIDATION_LIMITS.MAX_MENU_PHOTOS),
    stall_photos: z
      .array(z.string().url())
      .min(VALIDATION_LIMITS.MIN_STALL_PHOTOS)
      .max(VALIDATION_LIMITS.MAX_STALL_PHOTOS),
    primary_location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    food_categories: z.array(z.enum(FOOD_CATEGORIES as unknown as [string, ...string[]])).min(1),
  })
  .refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required',
  });

// Login Schema
export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email, phone, or username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Refresh Token Schema
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// Change Password Schema
export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// OTP Request Schema
export const requestOtpSchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number (format: +91XXXXXXXXXX)'),
});

// OTP Verify Schema  
export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

// Reset Password Request Schema
export const resetPasswordRequestSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/).optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

// Reset Password Schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

// Export types
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type RegisterVendorInput = z.infer<typeof registerVendorSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
