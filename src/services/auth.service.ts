import bcrypt from 'bcrypt';
import { db } from '../config/database';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { ConflictError, AuthenticationError, NotFoundError } from '../utils/errors';
import { User, AuthProvider } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

export interface SignupData {
  email?: string;
  phone?: string;
  password: string;
  username: string;
  displayName?: string;
}

export interface LoginData {
  emailOrPhone: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserWithTokens {
  user: Partial<User>;
  tokens: AuthTokens;
}

export class AuthService {
  /**
   * Register a new user
   */
  async signup(data: SignupData): Promise<UserWithTokens> {
    const { email, phone, password, username, displayName } = data;

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
          { username },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictError('Email already registered');
      }
      if (existingUser.phone === phone) {
        throw new ConflictError('Phone already registered');
      }
      if (existingUser.username === username) {
        throw new ConflictError('Username already taken');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user and auth identity in transaction
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          phone,
          displayName: displayName || username,
          trustScore: 100,
          status: 'ACTIVE',
        },
      });

      await tx.authIdentity.create({
        data: {
          userId: newUser.id,
          provider: AuthProvider.EMAIL,
          providerUserId: email || phone || username,
          passwordHash,
        },
      });

      // Create wallet for user
      await tx.wallet.create({
        data: {
          userId: newUser.id,
          balance: 0,
        },
      });

      return newUser;
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<UserWithTokens> {
    const { emailOrPhone, password } = data;

    // Find user by email or phone
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phone: emailOrPhone },
        ],
        status: 'ACTIVE',
      },
      include: {
        identities: {
          where: {
            provider: AuthProvider.EMAIL,
          },
        },
      },
    });

    if (!user || user.identities.length === 0) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const identity = user.identities[0];
    if (!identity.passwordHash) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, identity.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Update last login
    await db.authIdentity.update({
      where: { id: identity.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Partial<User>> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        avatarMedia: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const identity = await db.authIdentity.findFirst({
      where: {
        userId,
        provider: AuthProvider.EMAIL,
      },
    });

    if (!identity || !identity.passwordHash) {
      throw new AuthenticationError('No password set for this account');
    }

    const isValidPassword = await bcrypt.compare(oldPassword, identity.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await db.authIdentity.update({
      where: { id: identity.id },
      data: { passwordHash: newPasswordHash },
    });
  }

  /**
   * Social authentication (Apple/Google)
   */
  async socialAuth(
    provider: AuthProvider,
    providerUserId: string,
    email?: string,
    displayName?: string
  ): Promise<UserWithTokens> {
    // Find existing identity
    let identity = await db.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
      include: {
        user: true,
      },
    });

    let user: User;

    if (identity) {
      // User exists, just login
      user = identity.user;

      // Update last login
      await db.authIdentity.update({
        where: { id: identity.id },
        data: { lastLoginAt: new Date() },
      });
    } else {
      // New user, create account
      const username = email?.split('@')[0] || `user_${providerUserId.slice(0, 8)}`;

      user = await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            username,
            email,
            displayName,
            trustScore: 100,
            status: 'ACTIVE',
          },
        });

        await tx.authIdentity.create({
          data: {
            userId: newUser.id,
            provider,
            providerUserId,
          },
        });

        await tx.wallet.create({
          data: {
            userId: newUser.id,
            balance: 0,
          },
        });

        return newUser;
      });
    }

    const tokens = this.generateTokens(user.id);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(userId: string): AuthTokens {
    return {
      accessToken: generateAccessToken(userId),
      refreshToken: generateRefreshToken(userId),
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: any): Partial<User> {
    const { identities, ...sanitized } = user;
    return sanitized;
  }
}

export const authService = new AuthService();
