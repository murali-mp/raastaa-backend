// ==================== FOOD CATEGORIES ====================
export const FOOD_CATEGORIES = [
  'CHAAT',
  'CHINESE_STREET',
  'SOUTH_INDIAN',
  'NORTH_INDIAN',
  'MOMOS',
  'KEBABS_TIKKA',
  'PANI_PURI',
  'VADA_PAV',
  'ROLLS_WRAPS',
  'DESSERTS_SWEETS',
  'BEVERAGES',
  'FUSION',
  'REGIONAL_SPECIALTY',
  'BIRYANI',
  'DOSA',
  'PARATHA',
  'SANDWICH',
  'PIZZA',
  'BURGER',
  'OTHER',
] as const;

export type FoodCategory = typeof FOOD_CATEGORIES[number];

// ==================== REFERRAL SOURCES ====================
export const REFERRAL_SOURCES = [
  'FRIEND',
  'SOCIAL_MEDIA',
  'APP_STORE',
  'AD',
  'INFLUENCER',
  'OTHER',
] as const;

export type ReferralSource = typeof REFERRAL_SOURCES[number];

// ==================== ACCOUNT STATUS ====================
export const ACCOUNT_STATUS = [
  'ACTIVE',
  'SUSPENDED',
  'PENDING_VERIFICATION',
  'BANNED',
] as const;

export type AccountStatus = typeof ACCOUNT_STATUS[number];

// ==================== VERIFICATION TIERS ====================
export const VERIFICATION_TIERS = [
  'PENDING_REVIEW',
  'UNVERIFIED',
  'BASIC',
  'VERIFIED',
  'PREMIUM',
] as const;

export type VerificationTier = typeof VERIFICATION_TIERS[number];

// ==================== POST CONTENT TYPES ====================
export const POST_CONTENT_TYPES = [
  'TEXT',
  'IMAGE',
  'CAROUSEL',
  'VIDEO',
] as const;

export type PostContentType = typeof POST_CONTENT_TYPES[number];

// ==================== POST STATUS ====================
export const POST_STATUS = [
  'ACTIVE',
  'HIDDEN',
  'DELETED',
  'FLAGGED',
] as const;

export type PostStatus = typeof POST_STATUS[number];

// ==================== EXPEDITION STATUS ====================
export const EXPEDITION_STATUS = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export type ExpeditionStatus = typeof EXPEDITION_STATUS[number];

// ==================== EXPEDITION TYPES ====================
export const EXPEDITION_TYPES = [
  'SOLO',
  'TEAM',
] as const;

export type ExpeditionType = typeof EXPEDITION_TYPES[number];

// ==================== PRICE RANGES ====================
export const PRICE_RANGES = [
  'BUDGET',
  'MODERATE',
  'PREMIUM',
] as const;

export type PriceRange = typeof PRICE_RANGES[number];

// ==================== BOTTLE CAP ACTION TYPES ====================
export const ACTION_TYPES = [
  'DAILY_LOGIN',
  'VENDOR_FOLLOW',
  'EXPEDITION_COMPLETE',
  'RATING_WITH_PHOTO',
  'RATING_TEXT',
  'POST_WITH_VENDOR',
  'POST_CREATE',
  'LIKE_RECEIVED',
  'COMMENT_RECEIVED',
  'REFERRAL_BONUS',
  'REFERRAL_SIGNUP',
  'ACHIEVEMENT_UNLOCK',
  'EXPEDITION_CHECK_IN',
  'STREAK_BONUS',
  'LEVEL_UP',
  'PURCHASE',
  'REFUND',
  'ADMIN_ADJUSTMENT',
] as const;

export type ActionType = typeof ACTION_TYPES[number];

// ==================== NOTIFICATION TYPES ====================
export const NOTIFICATION_TYPES = [
  'FOLLOW',
  'LIKE',
  'COMMENT',
  'MENTION',
  'EXPEDITION_INVITE',
  'EXPEDITION_UPDATE',
  'ACHIEVEMENT',
  'BOTTLE_CAPS',
  'VENDOR_UPDATE',
  'FRIEND_REQUEST',
  'SYSTEM',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

// ==================== CONTENT FLAG REASONS ====================
export const FLAG_REASONS = [
  'SPAM',
  'INAPPROPRIATE',
  'HARASSMENT',
  'FALSE_INFORMATION',
  'VIOLENCE',
  'HATE_SPEECH',
  'COPYRIGHT',
  'OTHER',
] as const;

export type FlagReason = typeof FLAG_REASONS[number];

// ==================== ACHIEVEMENT CATEGORIES ====================
export const ACHIEVEMENT_CATEGORIES = [
  'EXPLORER',
  'SOCIAL',
  'FOODIE',
  'CONTRIBUTOR',
  'SPECIAL',
] as const;

export type AchievementCategory = typeof ACHIEVEMENT_CATEGORIES[number];

// ==================== ACHIEVEMENT TIERS ====================
export const ACHIEVEMENT_TIERS = [
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
] as const;

export type AchievementTier = typeof ACHIEVEMENT_TIERS[number];

// ==================== DAILY CAPS (Anti-farming) ====================
export const DAILY_CAPS = {
  total: 500,           // Max caps earnable per day
  likes_received: 50,   // Max caps from receiving likes
  comments_received: 60, // Max caps from receiving comments
  ratings: 45,          // Max caps from submitting ratings (3 with photo @ 15 each)
  posts: 50,            // Max caps from posting (5 posts @ 10 each)
  daily_login: 5,       // Daily login bonus
  POSTS: 5,             // Max posts earning caps per day
  COMMENTS: 10,         // Max comments earning caps per day
  LIKES: 20,            // Max likes earning caps per day
  RATINGS: 3,           // Max ratings earning caps per day
} as const;

// ==================== BOTTLE CAP REWARDS ====================
export const BOTTLE_CAP_REWARDS = {
  DAILY_LOGIN: 5,
  VENDOR_FOLLOW_FIRST: 10,
  EXPEDITION_SOLO_BASE: 50,
  EXPEDITION_TEAM_BASE: 75,
  EXPEDITION_PER_VENDOR: 10,
  RATING_WITH_PHOTO: 15,
  RATING_TEXT: 5,
  POST_WITH_VENDOR: 10,
  POST_CREATE: 5,
  COMMENT: 2,
  LIKE_RECEIVED: 1,
  COMMENT_RECEIVED: 2,
  REFERRAL_BONUS: 100,
  REFERRAL_SIGNUP: 50,
  CHECK_IN_BONUS: 5,
  STREAK_BONUS_7_DAYS: 25,
  STREAK_BONUS_30_DAYS: 100,
} as const;

// ==================== XP REWARDS ====================
export const XP_REWARDS = {
  POST_CREATE: 10,
  COMMENT: 5,
  RATING: 15,
  EXPEDITION_COMPLETE: 50,
  VENDOR_VISIT: 5,
  ACHIEVEMENT: 25,
} as const;

// ==================== LEVEL THRESHOLDS ====================
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  3500,   // Level 7
  5500,   // Level 8
  8000,   // Level 9
  11000,  // Level 10
  15000,  // Level 11+
] as const;

// ==================== CACHE KEYS ====================
export const CACHE_KEYS = {
  USER_PROFILE: (uuid: string) => `user:${uuid}:profile`,
  VENDOR_SUMMARY: (uuid: string) => `vendor:${uuid}:summary`,
  VENDOR_FULL: (uuid: string) => `vendor:${uuid}:full`,
  VENDORS_NEARBY: (geohash: string) => `vendors:nearby:${geohash}`,
  FEED_HOME: (uuid: string) => `feed:user:${uuid}:home`,
  FEED_EXPLORE: 'feed:explore',
  POST_COUNTS: (uuid: string) => `post:${uuid}:counts`,
  DAILY_CAPS: (uuid: string, date: string) => `caps:daily:${uuid}:${date}`,
  CAPS_RATE: (uuid: string, action: string) => `caps:rate:${uuid}:${action}`,
  SESSION: (jti: string) => `session:${jti}`,
  VENDOR_LOCATION: 'vendors:locations',
  VENDOR_META: (uuid: string) => `vendor:${uuid}:meta`,
  USER_LOCATION: (uuid: string) => `user:location:${uuid}`,
  USER_DAILY_ACTIONS: 'user:daily',
  TRENDING_HASHTAGS: 'trending:hashtags',
} as const;

// ==================== CACHE TTL (in seconds) ====================
export const CACHE_TTL = {
  USER_PROFILE: 300,      // 5 minutes
  VENDOR_SUMMARY: 120,    // 2 minutes
  VENDOR_FULL: 120,       // 2 minutes
  VENDORS_NEARBY: 30,     // 30 seconds
  FEED_HOME: 60,          // 1 minute
  FEED_EXPLORE: 300,      // 5 minutes
  POST_COUNTS: 30,        // 30 seconds
  SESSION: 604800,        // 7 days
  VENDOR_META: 3600,      // 1 hour
  USER_LOCATION: 1800,    // 30 minutes
} as const;

// ==================== PAGINATION ====================
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
  FEED_LIMIT: 20,
  COMMENTS_LIMIT: 20,
  SEARCH_LIMIT: 30,
} as const;

export const DEFAULT_PAGE_SIZE = PAGINATION.DEFAULT_LIMIT;
export const MAX_PAGE_SIZE = PAGINATION.MAX_LIMIT;

// ==================== VENDOR LIVE TTL ====================
export const VENDOR_LIVE_TTL = 3600; // 1 hour - must ping to stay live

// ==================== TRENDING HASHTAGS CACHE KEY ====================
export const CACHE_KEYS_EXTENDED = {
  ...CACHE_KEYS,
  TRENDING_HASHTAGS: 'trending:hashtags',
} as const;

// Merge with main CACHE_KEYS for backwards compatibility
Object.assign(CACHE_KEYS, { TRENDING_HASHTAGS: 'trending:hashtags' });

// ==================== GEO SETTINGS ====================
export const GEO_SETTINGS = {
  DEFAULT_RADIUS_METERS: 2000,
  MAX_RADIUS_METERS: 10000,
  CHECK_IN_RADIUS_METERS: 100,
  GEOHASH_PRECISION: 6,
} as const;

// ==================== VALIDATION LIMITS ====================
export const VALIDATION_LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 30,
  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 50,
  BIO_MAX: 500,
  POST_TEXT_MAX: 2000,
  COMMENT_MAX: 500,
  REVIEW_MAX: 1000,
  STORE_NAME_MIN: 3,
  STORE_NAME_MAX: 100,
  STORE_DESCRIPTION_MAX: 1000,
  EXPEDITION_TITLE_MAX: 100,
  EXPEDITION_DESCRIPTION_MAX: 500,
  MIN_AGE: 13,
  PASSWORD_MIN: 8,
  MAX_MEDIA_PER_POST: 10,
  MAX_MENU_PHOTOS: 10,
  MIN_MENU_PHOTOS: 1,
  MAX_STALL_PHOTOS: 15,
  MIN_STALL_PHOTOS: 2,
  MAX_RATING_PHOTOS: 5,
  MAX_EXPEDITION_PARTICIPANTS: 20,
} as const;
