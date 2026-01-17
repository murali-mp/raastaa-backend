# 🚀 RAASTA BACKEND - DETAILED EXECUTION PLAN
## Step-by-Step Implementation Guide

---

# 📍 PHASE 1: FOUNDATION (Week 1-2)
## Target: Core infrastructure, Auth, and Basic CRUD

---

### STEP 1.1: Digital Ocean Infrastructure Setup (Day 1)

**1.1.1 Create Digital Ocean Account & Apply Credits**
- [ ] Go to https://digitalocean.com and create account
- [ ] Apply for DO Startup Credits ($200 free): https://www.digitalocean.com/startups
- [ ] Set up billing (even with credits, required for resource creation)

**1.1.2 Create PostgreSQL Managed Database**
```bash
# Via DO Console OR doctl CLI
doctl databases create raasta-db \
  --engine pg \
  --version 16 \
  --size db-s-1vcpu-1gb \
  --region blr1  # Bangalore for India latency
```
- Size: db-s-1vcpu-1gb ($15/mo)
- Enable PostGIS extension via console: Databases → raasta-db → Connection Pools → SQL Query → `CREATE EXTENSION postgis;`
- Note down: DATABASE_URL (will look like `postgresql://user:pass@host:port/defaultdb?sslmode=require`)

**1.1.3 Create Redis Managed Database**
```bash
doctl databases create raasta-redis \
  --engine redis \
  --version 7 \
  --size db-s-1vcpu-1gb \
  --region blr1
```
- Note down: REDIS_URL (will look like `rediss://default:pass@host:port`)

**1.1.4 Create DO Spaces (Object Storage)**
- Console → Spaces → Create Space
- Name: `raasta`
- Region: `blr1` (Bangalore)
- CDN: Enable
- Permissions: Private (we'll use signed URLs)
- Generate Spaces Access Key: API → Spaces Keys → Generate New Key
- Note down: 
  - `DO_SPACES_KEY`
  - `DO_SPACES_SECRET`
  - `DO_SPACES_BUCKET=raasta`
  - `DO_SPACES_ENDPOINT=blr1.digitaloceanspaces.com`

**1.1.5 Create Discord Webhook for Admin Notifications**
- Create Discord server (or use existing)
- Server Settings → Integrations → Webhooks → New Webhook
- Name: "Raasta Admin Alerts"
- Copy webhook URL: `DISCORD_ADMIN_WEBHOOK=https://discord.com/api/webhooks/...`

---

### STEP 1.2: Project Initialization (Day 1-2)

**1.2.1 Create Project Structure**
```bash
mkdir raasta-backend && cd raasta-backend
npm init -y
```

**1.2.2 Install Dependencies**
```bash
# Core
npm install express cors helmet compression dotenv

# Database & ORM
npm install @prisma/client
npm install -D prisma

# Authentication
npm install bcrypt jsonwebtoken
npm install -D @types/bcrypt @types/jsonwebtoken

# Redis
npm install ioredis

# WebSockets
npm install socket.io

# File Upload
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer uuid

# Validation
npm install zod

# Rate Limiting
npm install express-rate-limit

# Logging
npm install winston

# TypeScript
npm install -D typescript ts-node @types/express @types/node @types/cors @types/compression @types/multer @types/uuid nodemon

# Testing
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

**1.2.3 Create Directory Structure**
```
raasta-backend/
├── src/
│   ├── config/
│   │   ├── database.ts         # Prisma client initialization
│   │   ├── redis.ts            # Redis client
│   │   ├── s3.ts               # DO Spaces client
│   │   └── env.ts              # Environment validation
│   ├── middleware/
│   │   ├── auth.ts             # JWT verification middleware
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   ├── errorHandler.ts     # Global error handler
│   │   └── validator.ts        # Zod validation middleware
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.schema.ts   # Zod schemas
│   │   ├── users/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.routes.ts
│   │   │   └── user.schema.ts
│   │   ├── vendors/
│   │   │   ├── vendor.controller.ts
│   │   │   ├── vendor.service.ts
│   │   │   ├── vendor.routes.ts
│   │   │   └── vendor.schema.ts
│   │   ├── posts/
│   │   │   ├── post.controller.ts
│   │   │   ├── post.service.ts
│   │   │   ├── post.routes.ts
│   │   │   └── post.schema.ts
│   │   ├── comments/
│   │   │   ├── comment.controller.ts
│   │   │   ├── comment.service.ts
│   │   │   ├── comment.routes.ts
│   │   │   └── comment.schema.ts
│   │   ├── expeditions/
│   │   │   ├── expedition.controller.ts
│   │   │   ├── expedition.service.ts
│   │   │   ├── expedition.routes.ts
│   │   │   └── expedition.schema.ts
│   │   ├── ratings/
│   │   │   ├── rating.controller.ts
│   │   │   ├── rating.service.ts
│   │   │   ├── rating.routes.ts
│   │   │   └── rating.schema.ts
│   │   ├── social/
│   │   │   ├── social.controller.ts
│   │   │   ├── social.service.ts
│   │   │   ├── social.routes.ts
│   │   │   └── social.schema.ts
│   │   ├── bottlecaps/
│   │   │   ├── bottlecaps.controller.ts
│   │   │   ├── bottlecaps.service.ts
│   │   │   ├── bottlecaps.routes.ts
│   │   │   └── bottlecaps.schema.ts
│   │   ├── uploads/
│   │   │   ├── upload.controller.ts
│   │   │   ├── upload.service.ts
│   │   │   └── upload.routes.ts
│   │   └── admin/
│   │       ├── admin.controller.ts
│   │       ├── admin.service.ts
│   │       ├── admin.routes.ts
│   │       └── admin.schema.ts
│   ├── utils/
│   │   ├── response.ts         # Standard API response wrapper
│   │   ├── logger.ts           # Winston logger setup
│   │   ├── discord.ts          # Discord webhook helper
│   │   ├── geo.ts              # Haversine distance, geohash
│   │   ├── pagination.ts       # Cursor pagination helpers
│   │   └── constants.ts        # FOOD_CATEGORIES, enums, etc.
│   ├── websocket/
│   │   ├── index.ts            # Socket.io setup
│   │   └── vendorLocation.ts   # Vendor location handler
│   ├── jobs/
│   │   └── syncLocations.ts    # Redis → PostgreSQL sync cron
│   ├── app.ts                  # Express app setup
│   ├── server.ts               # Server entry point
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Generated migrations
├── tests/
│   ├── auth.test.ts
│   ├── vendors.test.ts
│   └── ...
├── .env                        # Environment variables (gitignored)
├── .env.example                # Template for env vars
├── tsconfig.json
├── package.json
├── app.yaml                    # DO App Platform config
└── README.md
```

**1.2.4 Create TypeScript Config (tsconfig.json)**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**1.2.5 Create .env.example**
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/raasta?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Digital Ocean Spaces
DO_SPACES_KEY=your-spaces-key
DO_SPACES_SECRET=your-spaces-secret
DO_SPACES_BUCKET=raasta
DO_SPACES_ENDPOINT=blr1.digitaloceanspaces.com
DO_SPACES_CDN_ENDPOINT=raasta.blr1.cdn.digitaloceanspaces.com

# Discord (Admin Notifications)
DISCORD_ADMIN_WEBHOOK=https://discord.com/api/webhooks/...

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

### STEP 1.3: Database Schema with Prisma (Day 2-3)

**1.3.1 Initialize Prisma**
```bash
npx prisma init
```

**1.3.2 Create Complete Prisma Schema (prisma/schema.prisma)**

This will contain ALL models at once (refer to spec sections 3.1 - 3.9):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== USER MODEL ====================
model User {
  uuid             String   @id @default(uuid())
  email            String   @unique
  phone            String   @unique
  username         String   @unique
  password_hash    String
  display_name     String
  dob              DateTime
  profile_picture  String?
  food_preferences String[]
  referral_source  String?
  bio              String?  @db.VarChar(500)
  social_links     Json?
  ui_preferences   Json     @default("{\"theme\":\"light\",\"language\":\"en\"}")
  registered_ip    String
  is_vendor        Boolean  @default(false)
  account_status   String   @default("ACTIVE") // ACTIVE | SUSPENDED | PENDING_VERIFICATION

  // Cached counts
  followers_count Int @default(0)
  following_count Int @default(0)

  // Gamification
  bottle_caps BigInt @default(0)
  xp          BigInt @default(0)

  // Activity stats
  expeditions_completed Int @default(0)
  vendors_visited       Int @default(0)
  posts_count           Int @default(0)

  // Admin
  is_admin Boolean @default(false)

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Relations
  posts                   Post[]
  comments                Comment[]
  ratings                 Rating[]
  createdExpeditions      Expedition[]
  expeditionParticipations ExpeditionParticipant[]
  likes                   Like[]
  bottleCapTransactions   BottleCapTransaction[]
  
  // Social Relations
  followersRel  UserFollows[] @relation("Following")
  followingRel  UserFollows[] @relation("Followers")
  vendorFollows VendorFollows[]
  
  // Friendships
  friendshipsA Friendship[] @relation("UserA")
  friendshipsB Friendship[] @relation("UserB")
  
  // Reports
  contentFlagsReported ContentFlag[]

  @@index([username])
  @@index([email])
  @@index([phone])
}

// ==================== VENDOR MODEL ====================
model Vendor {
  uuid              String   @id @default(uuid())
  email             String?  @unique
  phone             String?  @unique
  password_hash     String
  vendor_name       String
  store_name        String
  store_description String   @db.VarChar(1000)
  operating_hours   Json
  upi_id            String
  menu_photos       String[]
  stall_photos      String[]
  primary_lat       Float
  primary_lng       Float
  food_categories   String[]

  // Denormalized ratings
  rating_hygiene   Float @default(0)
  rating_value     Float @default(0)
  rating_taste     Float @default(0)
  rating_recommend Float @default(0)
  rating_overall   Float @default(0)
  total_ratings    Int   @default(0)

  // Status
  verification_status String  @default("PENDING_REVIEW")
  is_currently_open   Boolean @default(false)

  // Metadata
  price_range     String   @default("MODERATE")
  specialties     String[]
  tags            String[]
  followers_count Int      @default(0)

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Relations
  ratings           Rating[]
  posts             Post[]
  vendorFollowers   VendorFollows[]
  location          VendorLocation?
  expeditionVendors ExpeditionVendor[]

  @@index([store_name])
  @@index([food_categories])
  @@index([verification_status])
}

// ==================== SOCIAL GRAPH ====================
model UserFollows {
  follower_id  String
  following_id String
  created_at   DateTime @default(now())

  follower  User @relation("Followers", fields: [follower_id], references: [uuid], onDelete: Cascade)
  following User @relation("Following", fields: [following_id], references: [uuid], onDelete: Cascade)

  @@id([follower_id, following_id])
  @@index([following_id])
}

model VendorFollows {
  user_id               String
  vendor_id             String
  created_at            DateTime @default(now())
  notifications_enabled Boolean  @default(true)

  user   User   @relation(fields: [user_id], references: [uuid], onDelete: Cascade)
  vendor Vendor @relation(fields: [vendor_id], references: [uuid], onDelete: Cascade)

  @@id([user_id, vendor_id])
  @@index([vendor_id])
}

model Friendship {
  id           String    @id @default(uuid())
  user_a       String
  user_b       String
  status       String    @default("PENDING") // PENDING | ACCEPTED | BLOCKED
  initiated_by String
  created_at   DateTime  @default(now())
  accepted_at  DateTime?

  userA User @relation("UserA", fields: [user_a], references: [uuid], onDelete: Cascade)
  userB User @relation("UserB", fields: [user_b], references: [uuid], onDelete: Cascade)

  @@unique([user_a, user_b])
  @@index([user_a])
  @@index([user_b])
}

// ==================== VENDOR LOCATION ====================
model VendorLocation {
  vendor_id       String   @id
  lat             Float
  lng             Float
  accuracy_meters Int      @default(100)
  is_active       Boolean  @default(true)
  updated_at      DateTime @updatedAt

  vendor Vendor @relation(fields: [vendor_id], references: [uuid], onDelete: Cascade)
}

// ==================== POSTS ====================
model Post {
  uuid          String   @id @default(uuid())
  author_id     String
  vendor_id     String?
  expedition_id String?

  // Content
  content_type String // TEXT | IMAGE | CAROUSEL | VIDEO
  text_content String?  @db.VarChar(2000)
  media_urls   String[]

  // Engagement
  likes_count    Int @default(0)
  comments_count Int @default(0)
  shares_count   Int @default(0)

  // Discovery
  hashtags     String[]
  mentions     String[]
  location_lat Float?
  location_lng Float?

  // Moderation
  status String @default("ACTIVE") // ACTIVE | HIDDEN | DELETED | FLAGGED

  // Timestamps
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  edited_at  DateTime?
  is_edited  Boolean   @default(false)

  // Relations
  author   User   @relation(fields: [author_id], references: [uuid], onDelete: Cascade)
  vendor   Vendor? @relation(fields: [vendor_id], references: [uuid], onDelete: SetNull)
  comments Comment[]
  likes    Like[]

  @@index([author_id, created_at(sort: Desc)])
  @@index([vendor_id, created_at(sort: Desc)])
  @@index([created_at(sort: Desc)])
  @@index([hashtags])
}

// ==================== COMMENTS ====================
model Comment {
  uuid             String   @id @default(uuid())
  post_id          String
  author_id        String
  reply_to_user_id String?

  content     String   @db.VarChar(500)
  mentions    String[]
  likes_count Int      @default(0)
  status      String   @default("ACTIVE") // ACTIVE | DELETED | FLAGGED

  created_at DateTime  @default(now())
  edited_at  DateTime?
  is_edited  Boolean   @default(false)

  post   Post @relation(fields: [post_id], references: [uuid], onDelete: Cascade)
  author User @relation(fields: [author_id], references: [uuid], onDelete: Cascade)

  @@index([post_id, created_at(sort: Asc)])
}

// ==================== LIKES (Polymorphic) ====================
model Like {
  id          String   @id @default(uuid())
  user_id     String
  target_type String // POST | COMMENT
  target_id   String
  created_at  DateTime @default(now())

  user User @relation(fields: [user_id], references: [uuid], onDelete: Cascade)

  @@unique([user_id, target_type, target_id])
  @@index([target_type, target_id])
}

// ==================== EXPEDITIONS ====================
model Expedition {
  uuid        String   @id @default(uuid())
  type        String // SOLO | TEAM
  creator_id  String

  title        String  @db.VarChar(100)
  description  String?
  planned_date DateTime @db.Date
  start_time   String?

  status       String    @default("DRAFT") // DRAFT | PLANNED | IN_PROGRESS | COMPLETED | CANCELLED
  started_at   DateTime?
  completed_at DateTime?

  vendor_count            Int @default(0)
  estimated_duration_mins Int?

  actual_duration_mins   Int?
  total_spent            Float?
  distance_walked_meters Int?

  bottle_caps_earned    Int      @default(0)
  achievements_unlocked String[]

  created_at DateTime @default(now())

  creator      User                    @relation(fields: [creator_id], references: [uuid], onDelete: Cascade)
  participants ExpeditionParticipant[]
  vendors      ExpeditionVendor[]

  @@index([creator_id, status])
  @@index([planned_date])
}

model ExpeditionParticipant {
  expedition_id String
  user_id       String
  role          String    @default("PARTICIPANT") // CREATOR | PARTICIPANT
  status        String    @default("INVITED") // INVITED | ACCEPTED | DECLINED
  joined_at     DateTime?

  expedition Expedition @relation(fields: [expedition_id], references: [uuid], onDelete: Cascade)
  user       User       @relation(fields: [user_id], references: [uuid], onDelete: Cascade)

  @@id([expedition_id, user_id])
}

model ExpeditionVendor {
  expedition_id    String
  vendor_id        String
  order_index      Int
  status           String    @default("PLANNED") // PLANNED | VISITED | SKIPPED
  visited_at       DateTime?
  rating_submitted Boolean   @default(false)

  expedition Expedition @relation(fields: [expedition_id], references: [uuid], onDelete: Cascade)
  vendor     Vendor     @relation(fields: [vendor_id], references: [uuid], onDelete: Cascade)

  @@id([expedition_id, vendor_id])
  @@index([expedition_id, order_index])
}

// ==================== RATINGS ====================
model Rating {
  uuid          String  @id @default(uuid())
  user_id       String
  vendor_id     String
  expedition_id String?

  hygiene         Int // 1-5
  value_for_money Int // 1-5
  taste           Int // 1-5
  recommendation  Int // 1-5

  review_text String?  @db.VarChar(1000)
  photos      String[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  user   User   @relation(fields: [user_id], references: [uuid], onDelete: Cascade)
  vendor Vendor @relation(fields: [vendor_id], references: [uuid], onDelete: Cascade)

  @@unique([user_id, vendor_id])
  @@index([vendor_id])
}

// ==================== BOTTLE CAPS ====================
model BottleCapTransaction {
  id            String   @id @default(uuid())
  user_id       String
  amount        Int // Positive = earn, Negative = spend
  action_type   String
  reference_id  String?
  balance_after BigInt
  created_at    DateTime @default(now())

  user User @relation(fields: [user_id], references: [uuid], onDelete: Cascade)

  @@index([user_id, created_at(sort: Desc)])
}

// ==================== CONTENT MODERATION ====================
model ContentFlag {
  id          String   @id @default(uuid())
  reporter_id String
  target_type String // POST | COMMENT | USER | VENDOR
  target_id   String
  reason      String
  status      String   @default("PENDING") // PENDING | REVIEWED | DISMISSED
  created_at  DateTime @default(now())

  reporter User @relation(fields: [reporter_id], references: [uuid], onDelete: Cascade)

  @@index([target_type, target_id])
  @@index([status])
}

// ==================== REFERRALS ====================
model ReferralCode {
  id         String   @id @default(uuid())
  user_id    String   @unique
  code       String   @unique
  uses_count Int      @default(0)
  created_at DateTime @default(now())
}

model ReferralUse {
  id               String   @id @default(uuid())
  referral_code_id String
  referred_user_id String   @unique
  created_at       DateTime @default(now())
}
```

**1.3.3 Run Initial Migration**
```bash
npx prisma migrate dev --name init
```

**1.3.4 Create Custom SQL Migration for Indexes**

Create file: `prisma/migrations/custom_indexes.sql`
```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Geospatial index for vendor location
CREATE INDEX IF NOT EXISTS idx_vendor_location_geo 
  ON "VendorLocation" USING GIST(ST_SetSRID(ST_MakePoint(lng, lat), 4326));

-- Geospatial index for posts with location
CREATE INDEX IF NOT EXISTS idx_post_location_geo 
  ON "Post" USING GIST(ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326))
  WHERE location_lat IS NOT NULL;

-- Feed performance indexes
CREATE INDEX IF NOT EXISTS idx_post_feed 
  ON "Post"(created_at DESC) 
  WHERE status = 'ACTIVE';

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_post_search 
  ON "Post" USING GIN(to_tsvector('english', text_content))
  WHERE text_content IS NOT NULL;
```

Run: `npx prisma db execute --file prisma/migrations/custom_indexes.sql`

---

### STEP 1.4: Core Configuration Files (Day 3)

**1.4.1 Create src/config/env.ts (Environment Validation)**
```typescript
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  DO_SPACES_KEY: z.string(),
  DO_SPACES_SECRET: z.string(),
  DO_SPACES_BUCKET: z.string(),
  DO_SPACES_ENDPOINT: z.string(),
  DO_SPACES_CDN_ENDPOINT: z.string().optional(),
  DISCORD_ADMIN_WEBHOOK: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

**1.4.2 Create src/config/database.ts (Prisma Client)**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**1.4.3 Create src/config/redis.ts**
```typescript
import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('error', (err) => console.error('Redis Client Error:', err));
redis.on('connect', () => console.log('✅ Redis connected'));
```

**1.4.4 Create src/config/s3.ts (DO Spaces Client)**
```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

export const s3Client = new S3Client({
  endpoint: `https://${env.DO_SPACES_ENDPOINT}`,
  region: 'us-east-1', // DO Spaces uses this regardless of actual region
  credentials: {
    accessKeyId: env.DO_SPACES_KEY,
    secretAccessKey: env.DO_SPACES_SECRET,
  },
});

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.DO_SPACES_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export function getCDNUrl(key: string): string {
  if (env.DO_SPACES_CDN_ENDPOINT) {
    return `https://${env.DO_SPACES_CDN_ENDPOINT}/${key}`;
  }
  return `https://${env.DO_SPACES_BUCKET}.${env.DO_SPACES_ENDPOINT}/${key}`;
}
```

---

### STEP 1.5: Utility Files (Day 3-4)

**1.5.1 Create src/utils/constants.ts**
```typescript
export const FOOD_CATEGORIES = [
  'CHAAT', 'CHINESE_STREET', 'SOUTH_INDIAN', 'NORTH_INDIAN',
  'MOMOS', 'KEBABS_TIKKA', 'PANI_PURI', 'VADA_PAV',
  'ROLLS_WRAPS', 'DESSERTS_SWEETS', 'BEVERAGES', 'FUSION',
  'REGIONAL_SPECIALTY', 'OTHER'
] as const;

export const REFERRAL_SOURCES = ['FRIEND', 'SOCIAL_MEDIA', 'APP_STORE', 'AD', 'OTHER'] as const;

export const ACCOUNT_STATUS = ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'] as const;

export const VERIFICATION_TIERS = ['UNVERIFIED', 'BASIC', 'VERIFIED', 'PREMIUM'] as const;

export const POST_CONTENT_TYPES = ['TEXT', 'IMAGE', 'CAROUSEL', 'VIDEO'] as const;

export const POST_STATUS = ['ACTIVE', 'HIDDEN', 'DELETED', 'FLAGGED'] as const;

export const EXPEDITION_STATUS = ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export const PRICE_RANGES = ['BUDGET', 'MODERATE', 'PREMIUM'] as const;

export const ACTION_TYPES = [
  'DAILY_LOGIN', 'VENDOR_FOLLOW', 'EXPEDITION_COMPLETE',
  'RATING_WITH_PHOTO', 'RATING_TEXT', 'POST_WITH_VENDOR',
  'LIKE_RECEIVED', 'COMMENT_RECEIVED', 'REFERRAL_BONUS',
  'ACHIEVEMENT_UNLOCK', 'PURCHASE', 'REFUND', 'ADMIN_ADJUSTMENT'
] as const;

export const DAILY_CAPS = {
  total: 500,
  likes_received: 50,
  comments_received: 60,
  ratings: 45,
  posts: 50
} as const;

export const BOTTLE_CAP_REWARDS = {
  DAILY_LOGIN: 5,
  VENDOR_FOLLOW_FIRST: 10,
  EXPEDITION_SOLO_BASE: 50,
  EXPEDITION_TEAM_BASE: 75,
  EXPEDITION_PER_VENDOR: 10,
  RATING_WITH_PHOTO: 15,
  RATING_TEXT: 5,
  POST_WITH_VENDOR: 10,
  LIKE_RECEIVED: 1,
  COMMENT_RECEIVED: 2,
  REFERRAL_BONUS: 100,
} as const;
```

**1.5.2 Create src/utils/response.ts**
```typescript
import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function errorResponse(res: Response, error: string, statusCode = 400): Response {
  return res.status(statusCode).json({
    success: false,
    error,
  });
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  nextCursor: string | null,
  totalCount?: number
): Response {
  return res.status(200).json({
    success: true,
    data: {
      items: data,
      next_cursor: nextCursor,
      total_count: totalCount,
    },
  });
}
```

**1.5.3 Create src/utils/logger.ts**
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
```

**1.5.4 Create src/utils/discord.ts**
```typescript
import { env } from '../config/env';

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  timestamp?: string;
}

export async function notifyAdmin(type: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch(env.DISCORD_ADMIN_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `🚨 ${type}`,
          description: JSON.stringify(data, null, 2).slice(0, 1000),
          color: type === 'NEW_VENDOR' ? 0x00ff00 : type.includes('ERROR') ? 0xff0000 : 0xffaa00,
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch (error) {
    console.error('Discord webhook error:', error);
  }
}
```

**1.5.5 Create src/utils/geo.ts**
```typescript
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Generate geohash for caching nearby queries
export function getGeohash(lat: number, lng: number, precision = 6): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (hash.length < precision) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= 1 << (4 - bit);
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}
```

**1.5.6 Create src/utils/pagination.ts**
```typescript
export function encodeCursor(data: { timestamp: Date; id: string }): string {
  return Buffer.from(JSON.stringify({ t: data.timestamp.toISOString(), i: data.id })).toString('base64');
}

export function decodeCursor(cursor: string): { timestamp: Date; id: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    return { timestamp: new Date(decoded.t), id: decoded.i };
  } catch {
    return null;
  }
}
```

---

### STEP 1.6: Authentication Module (Day 4-5)

**1.6.1 Create src/modules/auth/auth.schema.ts**
```typescript
import { z } from 'zod';
import { FOOD_CATEGORIES, REFERRAL_SOURCES } from '../../utils/constants';

export const registerUserSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number'),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase and number'),
  display_name: z.string().min(2).max(50),
  dob: z.string().datetime().refine((date) => {
    const age = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    return age >= 13;
  }, 'Must be at least 13 years old'),
  food_preferences: z.array(z.enum(FOOD_CATEGORIES)).optional(),
  referral_source: z.enum(REFERRAL_SOURCES).optional(),
  bio: z.string().max(500).optional(),
  referral_code: z.string().optional(),
});

export const registerVendorSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/).optional(),
  password: z.string().min(8),
  vendor_name: z.string().min(2).max(100),
  store_name: z.string().min(3).max(100),
  store_description: z.string().max(1000),
  operating_hours: z.record(z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
    is_closed: z.boolean(),
  })),
  upi_id: z.string().regex(/^[\w.-]+@[\w]+$/),
  menu_photos: z.array(z.string().url()).min(1).max(10),
  stall_photos: z.array(z.string().url()).min(2).max(15),
  primary_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  food_categories: z.array(z.enum(FOOD_CATEGORIES)).min(1),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
});

export const loginSchema = z.object({
  identifier: z.string(), // email, phone, or username
  password: z.string(),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type RegisterVendorInput = z.infer<typeof registerVendorSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

**1.6.2 Create src/modules/auth/auth.service.ts**
```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { RegisterUserInput, RegisterVendorInput, LoginInput } from './auth.schema';
import { notifyAdmin } from '../../utils/discord';
import { v4 as uuidv4 } from 'uuid';

const BCRYPT_ROUNDS = 10;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JWTPayload {
  uuid: string;
  type: 'user' | 'vendor';
  isAdmin?: boolean;
}

export class AuthService {
  async registerUser(input: RegisterUserInput, ip: string): Promise<{ user: any; tokens: TokenPair }> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    
    // Generate default avatar using DiceBear
    const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${input.username}`;
    
    const user = await prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        username: input.username,
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

    // Handle referral
    if (input.referral_code) {
      await this.processReferral(input.referral_code, user.uuid);
    }

    // Generate referral code for new user
    const referralCode = this.generateReferralCode();
    await prisma.referralCode.create({
      data: {
        user_id: user.uuid,
        code: referralCode,
      },
    });

    const tokens = await this.generateTokens({ uuid: user.uuid, type: 'user' });
    
    return { user: this.sanitizeUser(user), tokens };
  }

  async registerVendor(input: RegisterVendorInput): Promise<{ vendor: any }> {
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
    await notifyAdmin('NEW_VENDOR', {
      vendor_name: vendor.vendor_name,
      store_name: vendor.store_name,
      food_categories: vendor.food_categories,
      id: vendor.uuid,
    });

    return { vendor: this.sanitizeVendor(vendor) };
  }

  async login(input: LoginInput): Promise<{ user?: any; vendor?: any; tokens: TokenPair }> {
    // Try to find user first
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.identifier },
          { phone: input.identifier },
          { username: input.identifier },
        ],
      },
    });

    if (user) {
      const valid = await bcrypt.compare(input.password, user.password_hash);
      if (!valid) throw new Error('Invalid credentials');
      if (user.account_status !== 'ACTIVE') throw new Error('Account suspended');
      
      const tokens = await this.generateTokens({ uuid: user.uuid, type: 'user', isAdmin: user.is_admin });
      return { user: this.sanitizeUser(user), tokens };
    }

    // Try vendor
    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { email: input.identifier },
          { phone: input.identifier },
        ],
      },
    });

    if (vendor) {
      const valid = await bcrypt.compare(input.password, vendor.password_hash);
      if (!valid) throw new Error('Invalid credentials');
      
      const tokens = await this.generateTokens({ uuid: vendor.uuid, type: 'vendor' });
      return { vendor: this.sanitizeVendor(vendor), tokens };
    }

    throw new Error('Invalid credentials');
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_SECRET) as JWTPayload & { jti: string };
      
      // Check if token is in Redis (not revoked)
      const stored = await redis.get(`session:${payload.jti}`);
      if (!stored) throw new Error('Token revoked');
      
      // Revoke old token
      await redis.del(`session:${payload.jti}`);
      
      // Generate new tokens
      return this.generateTokens(payload);
    } catch {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = jwt.decode(refreshToken) as { jti: string } | null;
      if (payload?.jti) {
        await redis.del(`session:${payload.jti}`);
      }
    } catch {
      // Ignore errors during logout
    }
  }

  private async generateTokens(payload: JWTPayload): Promise<TokenPair> {
    const jti = uuidv4();
    
    const accessToken = jwt.sign(
      { ...payload },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY }
    );
    
    const refreshToken = jwt.sign(
      { ...payload, jti },
      env.JWT_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY }
    );
    
    // Store refresh token in Redis
    await redis.set(`session:${jti}`, JSON.stringify(payload), 'EX', 7 * 24 * 60 * 60);
    
    return { accessToken, refreshToken };
  }

  private async processReferral(code: string, newUserId: string): Promise<void> {
    const referral = await prisma.referralCode.findUnique({ where: { code } });
    if (!referral) return;
    
    await prisma.$transaction([
      prisma.referralUse.create({
        data: {
          referral_code_id: referral.id,
          referred_user_id: newUserId,
        },
      }),
      prisma.referralCode.update({
        where: { id: referral.id },
        data: { uses_count: { increment: 1 } },
      }),
      // Award bottle caps to referrer (handled by bottlecaps service)
    ]);
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private sanitizeUser(user: any) {
    const { password_hash, ...safe } = user;
    return safe;
  }

  private sanitizeVendor(vendor: any) {
    const { password_hash, ...safe } = vendor;
    return safe;
  }
}

export const authService = new AuthService();
```

**1.6.3 Create src/modules/auth/auth.controller.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { successResponse, errorResponse } from '../../utils/response';

export class AuthController {
  async registerUser(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const result = await authService.registerUser(req.body, ip);
      return successResponse(res, result, 201);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return errorResponse(res, 'Email, phone, or username already exists', 409);
      }
      next(error);
    }
  }

  async registerVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.registerVendor(req.body);
      return successResponse(res, { 
        ...result, 
        message: 'Registration submitted. Pending admin approval.' 
      }, 201);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return errorResponse(res, 'Email or phone already exists', 409);
      }
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      return successResponse(res, result);
    } catch (error: any) {
      return errorResponse(res, error.message, 401);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const tokens = await authService.refreshTokens(req.body.refresh_token);
      return successResponse(res, tokens);
    } catch (error: any) {
      return errorResponse(res, error.message, 401);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.body.refresh_token);
      return successResponse(res, { message: 'Logged out successfully' });
    } catch {
      return successResponse(res, { message: 'Logged out successfully' });
    }
  }
}

export const authController = new AuthController();
```

**1.6.4 Create src/modules/auth/auth.routes.ts**
```typescript
import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validator';
import { registerUserSchema, registerVendorSchema, loginSchema, refreshTokenSchema } from './auth.schema';

const router = Router();

router.post('/register/user', validate(registerUserSchema), authController.registerUser);
router.post('/register/vendor', validate(registerVendorSchema), authController.registerVendor);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);

export default router;
```

---

### STEP 1.7: Middleware (Day 5)

**1.7.1 Create src/middleware/auth.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { errorResponse } from '../utils/response';

export interface AuthRequest extends Request {
  user?: {
    uuid: string;
    type: 'user' | 'vendor';
    isAdmin?: boolean;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(res, 'No token provided', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthRequest['user'];
    req.user = payload;
    next();
  } catch {
    return errorResponse(res, 'Invalid token', 401);
  }
}

export function requireUser(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.type !== 'user') {
    return errorResponse(res, 'User access required', 403);
  }
  next();
}

export function requireVendor(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.type !== 'vendor') {
    return errorResponse(res, 'Vendor access required', 403);
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return errorResponse(res, 'Admin access required', 403);
  }
  next();
}
```

**1.7.2 Create src/middleware/validator.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { errorResponse } from '../utils/response';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return errorResponse(res, errors.join(', '), 422);
    }
    req.body = result.data;
    next();
  };
}
```

**1.7.3 Create src/middleware/rateLimiter.ts**
```typescript
import rateLimit from 'express-rate-limit';
import { redis } from '../config/redis';
import { env } from '../config/env';

// Memory-based for simplicity, use Redis store for production at scale
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute for authenticated
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: { success: false, error: 'Too many login attempts' },
});

export const anonLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 requests per minute for anonymous
  message: { success: false, error: 'Too many requests' },
});
```

**1.7.4 Create src/middleware/errorHandler.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled error:', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method 
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
}
```

---

### STEP 1.8: Express App Setup (Day 6)

**1.8.1 Create src/app.ts**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Routes
import authRoutes from './modules/auth/auth.routes';
// ... more routes will be added

const app = express();

// Security & Performance
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(apiLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip, 
    userAgent: req.headers['user-agent'] 
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/users', userRoutes);
// app.use('/api/v1/vendors', vendorRoutes);
// app.use('/api/v1/posts', postRoutes);
// app.use('/api/v1/expeditions', expeditionRoutes);
// app.use('/api/v1/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

export default app;
```

**1.8.2 Create src/server.ts**
```typescript
import 'dotenv/config';
import http from 'http';
import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';
// import { setupWebSocket } from './websocket';

const server = http.createServer(app);
// setupWebSocket(server); // Will be added in Phase 3

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Test Redis connection
    await redis.ping();
    logger.info('✅ Redis connected');

    server.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  redis.disconnect();
  server.close(() => process.exit(0));
});

main();
```

**1.8.3 Update package.json scripts**
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "test": "jest"
  }
}
```

---

### PHASE 1 CHECKPOINT ✅

**Test these endpoints before moving to Phase 2:**
```bash
# Register user
POST /api/v1/auth/register/user
{
  "email": "test@example.com",
  "phone": "+919876543210",
  "username": "foodie_test",
  "password": "Test1234",
  "display_name": "Test User",
  "dob": "2000-01-15T00:00:00Z"
}

# Register vendor
POST /api/v1/auth/register/vendor
{...}

# Login
POST /api/v1/auth/login
{
  "identifier": "test@example.com",
  "password": "Test1234"
}

# Refresh token
POST /api/v1/auth/refresh
{
  "refresh_token": "..."
}
```

---

# 📍 PHASE 2: SOCIAL & CONTENT (Week 3-4)

---

### STEP 2.1: Users Module (Day 7-8)

**Endpoints to implement:**
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update current user profile
- `GET /api/v1/users/:uuid` - Get user profile by ID
- `GET /api/v1/users/:uuid/posts` - Get user's posts
- `GET /api/v1/users/:uuid/followers` - Get user's followers
- `GET /api/v1/users/:uuid/following` - Get who user follows

**Create files:**
- `src/modules/users/user.schema.ts`
- `src/modules/users/user.service.ts`
- `src/modules/users/user.controller.ts`
- `src/modules/users/user.routes.ts`

---

### STEP 2.2: Vendors Module (Day 8-9)

**Endpoints to implement:**
- `GET /api/v1/vendors/nearby` - Find nearby vendors (THE MOST IMPORTANT ENDPOINT)
- `GET /api/v1/vendors/:uuid` - Get full vendor profile
- `GET /api/v1/vendors/:uuid/posts` - Get posts about vendor
- `GET /api/v1/vendors/:uuid/ratings` - Get vendor ratings
- `PATCH /api/v1/vendors/me` - Update vendor profile (vendor auth)

**Create files:**
- `src/modules/vendors/vendor.schema.ts`
- `src/modules/vendors/vendor.service.ts`
- `src/modules/vendors/vendor.controller.ts`
- `src/modules/vendors/vendor.routes.ts`

---

### STEP 2.3: Posts Module (Day 9-10)

**Endpoints to implement:**
- `GET /api/v1/feed` - Main feed (cursor pagination)
- `GET /api/v1/posts/:uuid` - Get single post
- `POST /api/v1/posts` - Create post
- `PATCH /api/v1/posts/:uuid` - Edit post
- `DELETE /api/v1/posts/:uuid` - Delete post
- `POST /api/v1/posts/:uuid/like` - Like post
- `DELETE /api/v1/posts/:uuid/like` - Unlike post
- `GET /api/v1/posts/search` - Search posts

**Key implementation details:**
- Extract hashtags: `text.match(/#[\w]+/g)`
- Extract mentions: `text.match(/@[\w]+/g)` → lookup user UUIDs
- Award bottle caps if vendor_id provided
- Use cursor pagination for feed

**Create files:**
- `src/modules/posts/post.schema.ts`
- `src/modules/posts/post.service.ts`
- `src/modules/posts/post.controller.ts`
- `src/modules/posts/post.routes.ts`

---

### STEP 2.4: Comments Module (Day 10-11)

**Endpoints to implement:**
- `GET /api/v1/posts/:postId/comments` - Get post comments
- `POST /api/v1/posts/:postId/comments` - Add comment
- `PATCH /api/v1/comments/:uuid` - Edit comment
- `DELETE /api/v1/comments/:uuid` - Delete comment
- `POST /api/v1/comments/:uuid/like` - Like comment
- `DELETE /api/v1/comments/:uuid/like` - Unlike comment

**Key implementation details:**
- Flat structure with reply_to_user_id
- Award 2 bottle caps to post author on comment
- Increment post.comments_count

**Create files:**
- `src/modules/comments/comment.schema.ts`
- `src/modules/comments/comment.service.ts`
- `src/modules/comments/comment.controller.ts`
- `src/modules/comments/comment.routes.ts`

---

### STEP 2.5: Social Module (Day 11-12)

**Endpoints to implement:**
- `POST /api/v1/users/:uuid/follow` - Follow user
- `DELETE /api/v1/users/:uuid/follow` - Unfollow user
- `POST /api/v1/vendors/:uuid/follow` - Follow vendor
- `DELETE /api/v1/vendors/:uuid/follow` - Unfollow vendor
- `GET /api/v1/friends` - Get friend list
- `POST /api/v1/friends/:uuid/request` - Send friend request
- `POST /api/v1/friends/:uuid/accept` - Accept friend request
- `DELETE /api/v1/friends/:uuid` - Remove friend/decline request

**Key implementation details:**
- Update followers_count on follow/unfollow
- Award 10 bottle caps on FIRST vendor follow
- Friendship requires acceptance

**Create files:**
- `src/modules/social/social.schema.ts`
- `src/modules/social/social.service.ts`
- `src/modules/social/social.controller.ts`
- `src/modules/social/social.routes.ts`

---

### STEP 2.6: File Upload Module (Day 12-13)

**Endpoints to implement:**
- `POST /api/v1/uploads/presigned-url` - Get presigned URL for client-side upload
- `DELETE /api/v1/uploads/:key` - Delete uploaded file

**Flow:**
1. Client requests presigned URL
2. Client uploads directly to DO Spaces
3. Client sends media URL in post/profile request

**Create files:**
- `src/modules/uploads/upload.service.ts`
- `src/modules/uploads/upload.controller.ts`
- `src/modules/uploads/upload.routes.ts`

---

### PHASE 2 CHECKPOINT ✅

**Test these endpoints:**
- Create post with vendor tag
- View feed with cursor pagination
- Comment on post
- Like/unlike posts and comments
- Follow/unfollow users and vendors
- Search posts by hashtag

---

# 📍 PHASE 3: GEOSPATIAL & REAL-TIME (Week 5-6)

---

### STEP 3.1: PostGIS Setup (Day 14)

**Verify PostGIS extension:**
```sql
SELECT PostGIS_Version();
```

**Create/verify indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_vendor_location_geo 
  ON "VendorLocation" USING GIST(ST_SetSRID(ST_MakePoint(lng, lat), 4326));
```

---

### STEP 3.2: Redis GeoSet Integration (Day 14-15)

**File: src/services/vendorLocationService.ts**

Implement:
- `updateVendorLocation(vendorId, lat, lng, accuracy)` - Updates Redis GeoSet
- `getNearbyVendors(lat, lng, radiusMeters, limit)` - Uses GEORADIUS
- `getVendorLocation(vendorId)` - Get current location from Redis
- `setVendorActive(vendorId, isActive)` - Toggle vendor availability

**Redis Commands:**
```javascript
// Store location
await redis.geoadd('vendors:locations', lng, lat, vendorId);
await redis.hset(`vendor:${vendorId}:meta`, { accuracy, updated_at: Date.now(), is_active: true });
await redis.expire(`vendor:${vendorId}:meta`, 3600);

// Query nearby
const nearby = await redis.georadius('vendors:locations', userLng, userLat, radiusMeters, 'm', 
  'WITHDIST', 'WITHCOORD', 'COUNT', 50, 'ASC');
```

---

### STEP 3.3: Vendor Nearby Endpoint Optimization (Day 15-16)

**File: src/modules/vendors/vendor.service.ts**

Implement the most optimized version of `/api/v1/vendors/nearby`:

1. Get vendor IDs from Redis GEORADIUS
2. Batch fetch vendor summaries from cache
3. Fill cache misses from PostgreSQL
4. Apply filters (categories, min_rating, is_open_now)
5. Return with distance and current location

**Caching strategy:**
- Cache key: `vendors:nearby:{geohash6}:{filters_hash}`
- TTL: 30 seconds

---

### STEP 3.4: WebSocket for Vendor Location (Day 16-17)

**File: src/websocket/index.ts**

```typescript
import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';

export function setupWebSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    path: '/ws',
  });

  io.use((socket, next) => {
    const token = socket.handshake.query.token as string;
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      if (payload.type !== 'vendor') {
        return next(new Error('Vendor access only'));
      }
      socket.data.vendor = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const vendorId = socket.data.vendor.uuid;
    console.log(`Vendor connected: ${vendorId}`);

    socket.on('location_update', async (data) => {
      // Rate limit: 1 update per 30 seconds
      const lastUpdate = await redis.get(`vendor:${vendorId}:last_ws_update`);
      if (lastUpdate && Date.now() - parseInt(lastUpdate) < 30000) {
        return socket.emit('ack', { status: 'rate_limited' });
      }

      // Update Redis GeoSet
      await redis.geoadd('vendors:locations', data.lng, data.lat, vendorId);
      await redis.hset(`vendor:${vendorId}:meta`, {
        accuracy: data.accuracy || 100,
        updated_at: Date.now(),
        is_active: 'true',
      });
      await redis.expire(`vendor:${vendorId}:meta`, 3600);
      await redis.set(`vendor:${vendorId}:last_ws_update`, Date.now().toString());

      socket.emit('ack', { status: 'updated' });
    });

    socket.on('disconnect', () => {
      console.log(`Vendor disconnected: ${vendorId}`);
    });
  });

  return io;
}
```

---

### STEP 3.5: Redis → PostgreSQL Sync Cron Job (Day 17-18)

**File: src/jobs/syncLocations.ts**

```typescript
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export async function syncVendorLocations() {
  try {
    // Get all vendor IDs from Redis GeoSet
    const members = await redis.zrange('vendors:locations', 0, -1);
    
    for (const vendorId of members) {
      const coords = await redis.geopos('vendors:locations', vendorId);
      const meta = await redis.hgetall(`vendor:${vendorId}:meta`);
      
      if (coords && coords[0]) {
        await prisma.vendorLocation.upsert({
          where: { vendor_id: vendorId },
          update: {
            lng: parseFloat(coords[0][0]),
            lat: parseFloat(coords[0][1]),
            accuracy_meters: parseInt(meta.accuracy) || 100,
            is_active: meta.is_active === 'true',
          },
          create: {
            vendor_id: vendorId,
            lng: parseFloat(coords[0][0]),
            lat: parseFloat(coords[0][1]),
            accuracy_meters: parseInt(meta.accuracy) || 100,
            is_active: meta.is_active === 'true',
          },
        });
      }
    }
    
    logger.info(`Synced ${members.length} vendor locations to PostgreSQL`);
  } catch (error) {
    logger.error('Location sync failed:', error);
  }
}

// Run every 5 minutes
setInterval(syncVendorLocations, 5 * 60 * 1000);
```

---

### PHASE 3 CHECKPOINT ✅

**Test:**
- `/vendors/nearby` returns vendors sorted by distance
- WebSocket connection works for vendors
- Location updates reflect in nearby queries
- PostgreSQL sync job runs every 5 minutes

---

# 📍 PHASE 4: EXPEDITIONS & GAMIFICATION (Week 7-8)

---

### STEP 4.1: Expeditions Module (Day 19-21)

**Endpoints:**
- `POST /api/v1/expeditions` - Create expedition
- `GET /api/v1/expeditions` - List user's expeditions
- `GET /api/v1/expeditions/:uuid` - Get expedition details
- `PATCH /api/v1/expeditions/:uuid` - Update expedition
- `DELETE /api/v1/expeditions/:uuid` - Delete expedition
- `PATCH /api/v1/expeditions/:uuid/status` - Change status
- `POST /api/v1/expeditions/:uuid/invite` - Invite users
- `POST /api/v1/expeditions/:uuid/respond` - Accept/decline invite
- `POST /api/v1/expeditions/:uuid/check-in` - Check in at vendor (GPS verified)

**Check-in validation:**
```typescript
async function validateCheckIn(userLat, userLng, vendorId) {
  // Get vendor location from Redis
  const vendorCoords = await redis.geopos('vendors:locations', vendorId);
  if (!vendorCoords || !vendorCoords[0]) {
    throw new Error('Vendor location not available');
  }
  
  const distance = haversineDistance(
    userLat, userLng,
    parseFloat(vendorCoords[0][1]), parseFloat(vendorCoords[0][0])
  );
  
  if (distance > 100) { // 100 meters
    throw new Error('You must be within 100 meters of the vendor');
  }
  
  return true;
}
```

**Auto-completion:**
When all vendors are visited, auto-complete expedition and award bottle caps.

**Create files:**
- `src/modules/expeditions/expedition.schema.ts`
- `src/modules/expeditions/expedition.service.ts`
- `src/modules/expeditions/expedition.controller.ts`
- `src/modules/expeditions/expedition.routes.ts`

---

### STEP 4.2: Bottle Caps Module (Day 21-23)

**Endpoints:**
- `GET /api/v1/bottlecaps/balance` - Get current balance
- `GET /api/v1/bottlecaps/transactions` - Get transaction history
- `GET /api/v1/bottlecaps/daily-status` - Get daily earning limits

**Core service functions:**
```typescript
// src/modules/bottlecaps/bottlecaps.service.ts

async function awardBottleCaps(userId, amount, actionType, referenceId = null) {
  // 1. Check daily caps
  // 2. Check velocity
  // 3. Apply new account multiplier
  // 4. Execute transaction
}

async function checkDailyCap(userId, actionType) {
  const dateKey = new Date().toISOString().split('T')[0];
  const key = `caps:daily:${userId}:${dateKey}`;
  const earned = await redis.hgetall(key);
  // Check against DAILY_CAPS
}

async function detectMutualFarming(userId, targetUserId) {
  // Check reciprocal likes in 24h window
}
```

**Create files:**
- `src/modules/bottlecaps/bottlecaps.service.ts`
- `src/modules/bottlecaps/bottlecaps.controller.ts`
- `src/modules/bottlecaps/bottlecaps.routes.ts`

---

### STEP 4.3: Ratings Module (Day 23-24)

**Endpoints:**
- `POST /api/v1/vendors/:vendorId/ratings` - Submit rating
- `GET /api/v1/vendors/:vendorId/ratings` - Get vendor ratings
- `PATCH /api/v1/ratings/:uuid` - Update rating

**Key implementation:**
- One rating per user per vendor
- Recalculate vendor averages on each rating
- Award bottle caps (15 with photo, 5 text only)

**Create files:**
- `src/modules/ratings/rating.schema.ts`
- `src/modules/ratings/rating.service.ts`
- `src/modules/ratings/rating.controller.ts`
- `src/modules/ratings/rating.routes.ts`

---

### STEP 4.4: Anti-Farming Implementation (Day 24-25)

**Implement all anti-abuse measures in bottlecaps service:**

1. **Daily caps per category** - Redis hash per user per day
2. **Velocity check** - Flag if > 500 caps/day
3. **Mutual engagement detection** - Check reciprocal patterns
4. **New account restrictions** - 50% multiplier for first 7 days
5. **GPS verification** - For expedition check-ins

---

### PHASE 4 CHECKPOINT ✅

**Test:**
- Create solo and team expeditions
- Invite users to expedition
- GPS-verified check-in
- Bottle caps awarded on completion
- Daily limits enforced
- Rating submission and vendor recalculation

---

# 📍 PHASE 5: POLISH & SCALE (Week 9-10)

---

### STEP 5.1: Full-Text Search (Day 26)

**Implement post search using PostgreSQL FTS:**

```typescript
// In post.service.ts
async function searchPosts(query: string, filters: SearchFilters) {
  return prisma.$queryRaw`
    SELECT p.*, ts_rank(to_tsvector('english', text_content), plainto_tsquery(${query})) as rank
    FROM "Post" p
    WHERE to_tsvector('english', text_content) @@ plainto_tsquery(${query})
      AND status = 'ACTIVE'
    ORDER BY rank DESC
    LIMIT ${filters.limit}
  `;
}
```

---

### STEP 5.2: Caching Layer (Day 27-28)

**Implement all cache keys from spec section 7:**

| Key Pattern | TTL |
|-------------|-----|
| `user:{uuid}:profile` | 5 min |
| `vendor:{uuid}:summary` | 2 min |
| `vendor:{uuid}:full` | 2 min |
| `vendors:nearby:{geohash6}` | 30 sec |
| `feed:user:{uuid}:home` | 1 min |
| `feed:explore` | 5 min |
| `post:{uuid}:counts` | 30 sec |

**Create cache helper:**
```typescript
// src/utils/cache.ts
async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fn();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}
```

---

### STEP 5.3: Admin Module (Day 28-29)

**Endpoints:**
- `GET /admin/vendors/pending` - List pending vendors
- `POST /admin/vendors/:uuid/approve` - Approve vendor
- `POST /admin/vendors/:uuid/reject` - Reject vendor
- `GET /admin/posts/flagged` - List flagged posts
- `POST /admin/posts/:uuid/approve` - Approve post
- `POST /admin/posts/:uuid/delete` - Delete post
- `GET /admin/users/flagged` - List flagged users
- `POST /admin/users/:uuid/suspend` - Suspend user
- `POST /admin/users/:uuid/unsuspend` - Unsuspend user
- `GET /admin/stats` - Dashboard statistics

**Create files:**
- `src/modules/admin/admin.service.ts`
- `src/modules/admin/admin.controller.ts`
- `src/modules/admin/admin.routes.ts`

---

### STEP 5.4: Content Moderation (Day 29)

**Implement flagging system:**

```typescript
async function flagContent(reporterId, targetType, targetId, reason) {
  await prisma.contentFlag.create({ ... });
  
  const count = await prisma.contentFlag.count({ where: { target_type, target_id } });
  
  if (count >= FLAG_THRESHOLD) {
    await hideContent(targetType, targetId);
    await notifyAdmin('CONTENT_AUTO_HIDDEN', { targetType, targetId, count });
  }
}
```

---

### STEP 5.5: Error Handling & Logging (Day 30)

**Enhance error handling:**
- Prisma error codes (P2002, P2025, etc.)
- Validation errors (Zod)
- Auth errors (JWT)
- Rate limit errors

**Enhance logging:**
- Request/response logging
- Error stack traces
- Performance metrics

---

### STEP 5.6: API Documentation (Day 30-31)

**Create OpenAPI/Swagger documentation:**

```typescript
// src/docs/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Raasta API',
      version: '1.0.0',
    },
    servers: [{ url: 'https://api.raasta.app/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    }
  },
  apis: ['./src/modules/**/routes.ts'],
};

export const specs = swaggerJsdoc(options);
```

---

### STEP 5.7: Testing (Day 31-32)

**Write tests for critical paths:**

```typescript
// tests/auth.test.ts
describe('Auth', () => {
  it('should register user', async () => { ... });
  it('should login user', async () => { ... });
  it('should refresh tokens', async () => { ... });
});

// tests/vendors.test.ts
describe('Vendors', () => {
  it('should find nearby vendors', async () => { ... });
  it('should return correct distances', async () => { ... });
});

// tests/bottlecaps.test.ts
describe('Bottle Caps', () => {
  it('should enforce daily limits', async () => { ... });
  it('should detect farming patterns', async () => { ... });
});
```

---

### STEP 5.8: Digital Ocean Deployment (Day 32-33)

**1. Create app.yaml:**
```yaml
name: raasta-api
region: blr
services:
  - name: api
    github:
      repo: yourname/raasta-backend
      branch: main
      deploy_on_push: true
    build_command: npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${raasta-db.DATABASE_URL}
      - key: REDIS_URL
        scope: RUN_TIME
        value: ${raasta-redis.REDIS_URL}
      - key: JWT_SECRET
        scope: RUN_TIME
        type: SECRET
      # ... other env vars
    http_port: 3000
    routes:
      - path: /

databases:
  - name: raasta-db
    engine: PG
    version: "16"
    size: db-s-1vcpu-1gb
  - name: raasta-redis
    engine: REDIS
    version: "7"
    size: db-s-1vcpu-1gb
```

**2. Deploy:**
```bash
doctl apps create --spec app.yaml
```

**3. Post-deployment:**
- Run migrations: `npx prisma migrate deploy`
- Run custom SQL indexes
- Test all endpoints
- Set up monitoring

---

### PHASE 5 CHECKPOINT ✅ (FINAL)

**Verify:**
- [ ] All endpoints functional
- [ ] Real-time vendor location working
- [ ] Bottle caps economy working with anti-abuse
- [ ] Admin panel functional
- [ ] Deployed on Digital Ocean
- [ ] All indexes and caching in place
- [ ] Tests passing
- [ ] API documentation complete

---

# 📊 SUMMARY

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1** | Week 1-2 | DO Setup, Auth, Basic CRUD |
| **Phase 2** | Week 3-4 | Posts, Comments, Likes, Social |
| **Phase 3** | Week 5-6 | Geo queries, WebSocket, Real-time |
| **Phase 4** | Week 7-8 | Expeditions, Bottle Caps, Ratings |
| **Phase 5** | Week 9-10 | Search, Caching, Admin, Deploy |

**Total: 10 weeks to production-ready Raasta backend**

---

# 🎯 SUCCESS CRITERIA

✅ All 50+ API endpoints functional  
✅ PostgreSQL + PostGIS for geospatial  
✅ Redis for caching and real-time location  
✅ WebSocket for vendor location updates  
✅ Bottle caps economy with anti-farming  
✅ JWT authentication (no Firebase!)  
✅ DO Spaces for file storage  
✅ Discord webhooks for admin alerts  
✅ Deployed on Digital Ocean < $50/month  
✅ All tests passing  

---

**LET'S GET THIS 3 CRORE! 🚀💰**
