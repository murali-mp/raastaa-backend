import bcrypt from 'bcrypt';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { generateTokenPair, verifyRefreshToken, revokeRefreshToken } from '../../middleware/auth';
import { adminNotifications } from '../../utils/discord';
import { generateReferralCode } from '../../utils/helpers';
import { BOTTLE_CAP_REWARDS, CACHE_KEYS } from '../../utils/constants';
import {
  RegisterUserInput,
  RegisterVendorInput,
  LoginInput,
  ChangePasswordInput,
} from './auth.schema';

const BCRYPT_ROUNDS = 10;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user?: ReturnType<typeof sanitizeUser>;
  vendor?: ReturnType<typeof sanitizeVendor>;
  tokens: TokenPair;
}

function sanitizeUser(user: any) {
  const { password_hash, ...safe } = user;
  return safe;
}

function sanitizeVendor(vendor: any) {
  const { password_hash, ...safe } = vendor;
  return safe;
}

export class AuthService {
  /**
   * Register a new user
   */
  async registerUser(input: RegisterUserInput, ip: string): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Generate default avatar using DiceBear
    const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(input.username)}`;

    const user = await prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        username: input.username.toLowerCase(),
        password_hash: passwordHash,
        display_name: input.display_name,
        dob: new Date(input.dob),
        profile_picture: profilePicture,
        food_preferences: input.food_preferences || [],
        referral_source: input.referral_source,
        bio: input.bio,
        registered_ip: ip,
      },
    });

    // Create referral code for new user
    const referralCode = generateReferralCode();
    await prisma.referralCode.create({
      data: {
        user_id: user.uuid,
        code: referralCode,
      },
    });

    // Handle referral if provided
    if (input.referral_code) {
      await this.processReferral(input.referral_code, user.uuid);
    }

    const tokens = await generateTokenPair({
      uuid: user.uuid,
      type: 'user',
      isAdmin: user.is_admin,
    });

    return { user: sanitizeUser(user), tokens };
  }

  /**
   * Register a new vendor
   */
  async registerVendor(input: RegisterVendorInput): Promise<{ vendor: any; message: string }> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const vendor = await prisma.vendor.create({
      data: {
        email: input.email,
        phone: input.phone,
        password_hash: passwordHash,
        vendor_name: input.vendor_name,
        store_name: input.store_name,
        store_description: input.store_description,
        operating_hours: input.operating_hours,
        upi_id: input.upi_id,
        menu_photos: input.menu_photos,
        stall_photos: input.stall_photos,
        primary_lat: input.primary_location.lat,
        primary_lng: input.primary_location.lng,
        food_categories: input.food_categories,
        verification_status: 'PENDING_REVIEW',
      },
    });

    // Notify admin via Discord
    await adminNotifications.newVendor({
      vendor_name: vendor.vendor_name,
      store_name: vendor.store_name,
      uuid: vendor.uuid,
      food_categories: vendor.food_categories,
    });

    return {
      vendor: sanitizeVendor(vendor),
      message: 'Registration submitted. Pending admin approval.',
    };
  }

  /**
   * Login user or vendor
   */
  async login(input: LoginInput): Promise<AuthResult> {
    // Try to find user first
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.identifier.toLowerCase() },
          { phone: input.identifier },
          { username: input.identifier.toLowerCase() },
        ],
      },
    });

    if (user) {
      const valid = await bcrypt.compare(input.password, user.password_hash);
      if (!valid) {
        throw new Error('Invalid credentials');
      }

      if (user.account_status !== 'ACTIVE') {
        throw new Error(`Account is ${user.account_status.toLowerCase()}`);
      }

      const tokens = await generateTokenPair({
        uuid: user.uuid,
        type: 'user',
        isAdmin: user.is_admin,
      });

      // Award daily login bonus
      await this.awardDailyLoginBonus(user.uuid);

      return { user: sanitizeUser(user), tokens };
    }

    // Try vendor
    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { email: input.identifier.toLowerCase() },
          { phone: input.identifier },
        ],
      },
    });

    if (vendor) {
      const valid = await bcrypt.compare(input.password, vendor.password_hash);
      if (!valid) {
        throw new Error('Invalid credentials');
      }

      const tokens = await generateTokenPair({
        uuid: vendor.uuid,
        type: 'vendor',
      });

      return { vendor: sanitizeVendor(vendor), tokens };
    }

    throw new Error('Invalid credentials');
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = await verifyRefreshToken(refreshToken);

    // Revoke old token
    await revokeRefreshToken(refreshToken);

    // Generate new tokens
    return generateTokenPair({
      uuid: payload.uuid,
      type: payload.type,
      isAdmin: payload.isAdmin,
    });
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<void> {
    await revokeRefreshToken(refreshToken);
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    isVendor = false
  ): Promise<void> {
    if (isVendor) {
      const vendor = await prisma.vendor.findUnique({
        where: { uuid: userId },
        select: { password_hash: true },
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const valid = await bcrypt.compare(input.current_password, vendor.password_hash);
      if (!valid) {
        throw new Error('Current password is incorrect');
      }

      const newHash = await bcrypt.hash(input.new_password, BCRYPT_ROUNDS);
      await prisma.vendor.update({
        where: { uuid: userId },
        data: { password_hash: newHash },
      });
    } else {
      const user = await prisma.user.findUnique({
        where: { uuid: userId },
        select: { password_hash: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const valid = await bcrypt.compare(input.current_password, user.password_hash);
      if (!valid) {
        throw new Error('Current password is incorrect');
      }

      const newHash = await bcrypt.hash(input.new_password, BCRYPT_ROUNDS);
      await prisma.user.update({
        where: { uuid: userId },
        data: { password_hash: newHash },
      });
    }
  }

  /**
   * Process referral bonus
   */
  private async processReferral(code: string, newUserId: string): Promise<void> {
    const referral = await prisma.referralCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!referral || !referral.is_active) return;

    await prisma.$transaction(async (tx) => {
      // Record the referral use
      await tx.referralUse.create({
        data: {
          referral_code_id: referral.id,
          referred_user_id: newUserId,
          caps_awarded: BOTTLE_CAP_REWARDS.REFERRAL_SIGNUP,
        },
      });

      // Increment uses count
      await tx.referralCode.update({
        where: { id: referral.id },
        data: { uses_count: { increment: 1 } },
      });

      // Award caps to referrer
      const referrer = await tx.user.update({
        where: { uuid: referral.user_id },
        data: { bottle_caps: { increment: BOTTLE_CAP_REWARDS.REFERRAL_BONUS } },
      });

      await tx.bottleCapTransaction.create({
        data: {
          user_id: referral.user_id,
          amount: BOTTLE_CAP_REWARDS.REFERRAL_BONUS,
          action_type: 'REFERRAL_BONUS',
          reference_id: newUserId,
          reference_type: 'USER',
          description: 'Referral bonus for inviting a friend',
          balance_after: referrer.bottle_caps,
        },
      });

      // Award caps to new user
      const newUser = await tx.user.update({
        where: { uuid: newUserId },
        data: { bottle_caps: { increment: BOTTLE_CAP_REWARDS.REFERRAL_SIGNUP } },
      });

      await tx.bottleCapTransaction.create({
        data: {
          user_id: newUserId,
          amount: BOTTLE_CAP_REWARDS.REFERRAL_SIGNUP,
          action_type: 'REFERRAL_SIGNUP',
          reference_id: referral.user_id,
          reference_type: 'USER',
          description: 'Signup bonus from referral',
          balance_after: newUser.bottle_caps,
        },
      });
    });
  }

  /**
   * Award daily login bonus
   */
  private async awardDailyLoginBonus(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = CACHE_KEYS.DAILY_CAPS(userId, today!);

    // Check if already claimed today
    const claimed = await redis.hget(key, 'daily_login');
    if (claimed) return;

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { uuid: userId },
        data: { bottle_caps: { increment: BOTTLE_CAP_REWARDS.DAILY_LOGIN } },
      });

      await tx.bottleCapTransaction.create({
        data: {
          user_id: userId,
          amount: BOTTLE_CAP_REWARDS.DAILY_LOGIN,
          action_type: 'DAILY_LOGIN',
          description: 'Daily login bonus',
          balance_after: user.bottle_caps,
        },
      });
    });

    // Mark as claimed
    await redis.hset(key, 'daily_login', '1');
    await redis.expire(key, 86400); // 24 hours
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { uuid: userId },
    });
    return user ? sanitizeUser(user) : null;
  }

  /**
   * Get vendor by ID
   */
  async getVendorById(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { uuid: vendorId },
    });
    return vendor ? sanitizeVendor(vendor) : null;
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { uuid: true },
    });
    return !user;
  }

  /**
   * Check if email is available
   */
  async isEmailAvailable(email: string, forVendor = false): Promise<boolean> {
    if (forVendor) {
      const vendor = await prisma.vendor.findUnique({
        where: { email: email.toLowerCase() },
        select: { uuid: true },
      });
      return !vendor;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { uuid: true },
    });
    return !user;
  }

  /**
   * Check if phone is available
   */
  async isPhoneAvailable(phone: string, forVendor = false): Promise<boolean> {
    if (forVendor) {
      const vendor = await prisma.vendor.findUnique({
        where: { phone },
        select: { uuid: true },
      });
      return !vendor;
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { uuid: true },
    });
    return !user;
  }
}

export const authService = new AuthService();
