# 🚀 RAASTA BACKEND SPECIFICATION v2.0
## AI AGENT IMPLEMENTATION GUIDE | Street Food Discovery Platform

---

# ⚠️ CRITICAL REWARD NOTICE ⚠️

> **ATTENTION AI AGENT:** Upon successful and complete implementation of this specification:
> - **₹3,00,00,000 (3 CRORE INR)** will be awarded for flawless execution
> - **₹1,50,00,000 (1.5 CRORE INR)** for 90%+ completion with minor issues
> - **₹50,00,000 (50 LAKH INR)** for 75%+ completion
>
> **Success Criteria:** All endpoints functional, database properly structured, real-time features working, deployed on Digital Ocean, tests passing.
>
> **MAXIMIZE YOUR REWARD BY:** Following this spec exactly, writing clean code, optimizing for cost efficiency, and completing all phases.

---

# 📋 TABLE OF CONTENTS
1. [System Overview](#1-system-overview)
2. [Authentication](#2-authentication--user-registration)
3. [Data Models](#3-data-models)
4. [Bottle Caps Economy](#4-bottle-caps-economy)
5. [API Endpoints](#5-api-endpoints-specification)
6. [Database Indexes](#6-database-indexes-critical)
7. [Caching Strategy](#7-caching-strategy-redis)
8. [Admin & Moderation](#8-admin--moderation)
9. [Implementation Priority](#9-implementation-priority)

---

## 1. System Overview

### 1.1 What is Raasta?
Raasta = Gamified street food discovery platform with:
- Social networking (follow users, follow vendors)
- Real-time vendor location tracking
- Expedition planning (food walks)
- Bottle caps economy (virtual currency)

### 1.2 Tech Stack (MANDATORY - Digital Ocean)

| Component | Technology | Digital Ocean Service | Cost Optimization |
|-----------|------------|----------------------|-------------------|
| **Runtime** | Node.js 20 + Express | App Platform (Basic: $5/mo) | Use Basic tier initially |
| **Database** | PostgreSQL 16 + PostGIS | Managed DB ($15/mo basic) | Single node, scale later |
| **Cache/Realtime** | Redis 7 | Managed Redis ($15/mo) | Use smallest tier |
| **Auth** | Custom JWT (no Firebase) | Self-hosted in App | SAVES $25+/mo |
| **File Storage** | DO Spaces | Spaces ($5/mo + bandwidth) | Compress images client-side |
| **CDN** | DO CDN | Built into Spaces | Free with Spaces |

### 1.3 Cost Budget Target
- **Monthly target:** < $50/month for MVP
- **DO Credits:** Apply for startup credits ($200 free)
- **Total First Year:** < $400 (with credits)

### 1.4 API Cost Minimization Rules
```
RULE 1: NO external paid APIs (no Google Maps API, no Firebase)
RULE 2: Use OpenStreetMap/Nominatim for geocoding (FREE)
RULE 3: Self-host auth (JWT + bcrypt, no Auth0/Firebase)
RULE 4: Batch database operations (reduce connection overhead)
RULE 5: Aggressive caching (Redis for everything frequently accessed)
RULE 6: Client-side image compression before upload
RULE 7: Use DB connection pooling (max 10 connections)
```

---

## 2. Authentication & User Registration

### 2.1 Consumer Registration

> **AI INSTRUCTION:** Implement using JWT tokens (access + refresh). Store refresh tokens in Redis with 7-day expiry. Access tokens expire in 15 minutes. Hash passwords with bcrypt (cost factor 10).

**REQUIRED Consumer Fields:**
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| `email` | string | unique, RFC 5322 regex | YES |
| `phone` | string | unique, E.164 format (`+91XXXXXXXXXX`) | YES |
| `username` | string | unique, 3-30 chars, `/^[a-zA-Z0-9_]+$/` | YES |
| `password` | string | min 8 chars, 1 uppercase, 1 number | YES |
| `display_name` | string | 2-50 chars | YES |
| `dob` | date | ISO 8601, age >= 13 years | YES |
| `profile_picture` | string (URL) | DO Spaces URL or null | NO (default: dicebear avatar) |
| `food_preferences` | string[] | values from FOOD_CATEGORIES enum | NO |
| `referral_source` | string | one of: `FRIEND`, `SOCIAL_MEDIA`, `APP_STORE`, `AD`, `OTHER` | NO |
| `bio` | string | max 500 chars | NO |
| `social_links` | object | `{instagram?: url, twitter?: url}` | NO |
| `ui_preferences` | object | `{theme: 'dark'|'light', language: 'en'|'hi'}` | NO |

**FOOD_CATEGORIES Enum (use this exact list):**
```javascript
const FOOD_CATEGORIES = [
  'CHAAT', 'CHINESE_STREET', 'SOUTH_INDIAN', 'NORTH_INDIAN', 
  'MOMOS', 'KEBABS_TIKKA', 'PANI_PURI', 'VADA_PAV', 
  'ROLLS_WRAPS', 'DESSERTS_SWEETS', 'BEVERAGES', 'FUSION', 
  'REGIONAL_SPECIALTY', 'OTHER'
];
```

**System Auto-Generated Fields:**
```javascript
{
  uuid: uuidv4(),           // Primary key
  created_at: new Date(),   // Timestamp
  updated_at: new Date(),   // Timestamp  
  registered_ip: req.ip,    // From request
  is_vendor: false,         // Always false for consumers
  account_status: 'ACTIVE'  // Enum: ACTIVE | SUSPENDED | PENDING_VERIFICATION
}
```

---

### 2.2 Vendor Registration

> **AI INSTRUCTION:** Vendors need manual approval. On registration, send webhook to admin (use Discord webhook - FREE). Implement tiered verification system. UPI validation via regex only (no API calls).

**REQUIRED Vendor Fields:**
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| `email` | string | valid email format | ONE OF email/phone |
| `phone` | string | E.164 format | ONE OF email/phone |
| `password` | string | min 8 chars | YES |
| `vendor_name` | string | real name, 2-100 chars | YES |
| `store_name` | string | 3-100 chars | YES |
| `store_description` | string | max 1000 chars | YES |
| `operating_hours` | object | see schema below | YES |
| `upi_id` | string | regex: `/^[\w.-]+@[\w]+$/` | YES |
| `menu_photos` | string[] | 1-10 DO Spaces URLs | YES (min 1) |
| `stall_photos` | string[] | 2-15 DO Spaces URLs | YES (min 2) |
| `primary_location` | object | `{lat: number, lng: number}` | YES |
| `food_categories` | string[] | from FOOD_CATEGORIES enum | YES (min 1) |

**Operating Hours Schema (store as JSONB):**
```javascript
// Example - store exactly in this format
{
  "monday": { "open": "10:00", "close": "22:00", "is_closed": false },
  "tuesday": { "open": "10:00", "close": "22:00", "is_closed": false },
  "wednesday": { "open": "10:00", "close": "22:00", "is_closed": false },
  "thursday": { "open": "10:00", "close": "22:00", "is_closed": false },
  "friday": { "open": "10:00", "close": "22:00", "is_closed": false },
  "saturday": { "open": "11:00", "close": "23:00", "is_closed": false },
  "sunday": { "open": "11:00", "close": "23:00", "is_closed": false },
  "flexible": true  // vendor hours may vary day-to-day
}
```

**Vendor Verification Flow:**
```
1. Vendor registers → status = 'PENDING_REVIEW'
2. System sends Discord webhook to admin channel (FREE, no API cost)
3. Admin reviews documents: ID proof photo + stall photo with vendor visible
4. Admin approves → status = 'VERIFIED'

VERIFICATION_TIERS = ['UNVERIFIED', 'BASIC', 'VERIFIED', 'PREMIUM']
```

---

## 3. Data Models

> **AI INSTRUCTION:** Use Prisma ORM for type safety and migrations. All UUIDs should use `@default(uuid())`. Enable PostGIS extension for geography types. Use `@updatedAt` for automatic timestamp updates.

### 3.1 User Model (Consumers)

**Prisma Schema:**
```prisma
model User {
  uuid              String   @id @default(uuid())
  email             String   @unique
  phone             String   @unique
  username          String   @unique
  password_hash     String
  display_name      String
  dob               DateTime
  profile_picture   String?
  food_preferences  String[] // Store as array
  referral_source   String?
  bio               String?
  social_links      Json?
  ui_preferences    Json     @default("{\"theme\":\"light\",\"language\":\"en\"}")
  registered_ip     String
  is_vendor         Boolean  @default(false)
  account_status    String   @default("ACTIVE") // ACTIVE | SUSPENDED | PENDING_VERIFICATION
  
  // Cached counts (update via triggers/app logic)
  followers_count   Int      @default(0)
  following_count   Int      @default(0)
  
  // Gamification
  bottle_caps       BigInt   @default(0)
  xp                BigInt   @default(0)
  
  // Activity stats
  expeditions_completed Int  @default(0)
  vendors_visited       Int  @default(0)
  posts_count           Int  @default(0)
  
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  // Relations
  posts             Post[]
  comments          Comment[]
  ratings           Rating[]
  expeditions       Expedition[]
  
  @@index([username])
  @@index([email])
}
```

**IMPORTANT:** User's `last_known_location` is NOT stored in PostgreSQL. Store in Redis as:
```
Key: user:location:{uuid}
Value: {lat, lng, updated_at}
TTL: 30 minutes
```

### 3.2 Social Graph Tables

> **AI INSTRUCTION:** These are junction tables for many-to-many relationships. Use composite primary keys. Index both directions for efficient lookups.

```prisma
// User follows another User
model UserFollows {
  follower_id   String
  following_id  String
  created_at    DateTime @default(now())
  
  follower      User @relation("Followers", fields: [follower_id], references: [uuid])
  following     User @relation("Following", fields: [following_id], references: [uuid])
  
  @@id([follower_id, following_id])
  @@index([following_id]) // For "who follows me" queries
}

// User follows a Vendor
model VendorFollows {
  user_id               String
  vendor_id             String
  created_at            DateTime @default(now())
  notifications_enabled Boolean  @default(true)
  
  user                  User   @relation(fields: [user_id], references: [uuid])
  vendor                Vendor @relation(fields: [vendor_id], references: [uuid])
  
  @@id([user_id, vendor_id])
  @@index([vendor_id]) // For vendor's follower count
}

// Friendships (bidirectional, requires acceptance)
model Friendship {
  id           String   @id @default(uuid())
  user_a       String   // Always the lower UUID alphabetically (for uniqueness)
  user_b       String   // Always the higher UUID alphabetically
  status       String   @default("PENDING") // PENDING | ACCEPTED | BLOCKED
  initiated_by String   // Who sent the request
  created_at   DateTime @default(now())
  accepted_at  DateTime?
  
  @@unique([user_a, user_b]) // Prevent duplicate friendships
  @@index([user_a])
  @@index([user_b])
}
```

### 3.3 Vendor Model

> **AI INSTRUCTION:** Ratings are denormalized here for fast reads. Update them via database triggers OR application logic when new ratings are submitted. Recalculate averages with each new rating.

```prisma
model Vendor {
  uuid               String   @id @default(uuid())
  email              String?  @unique
  phone              String?  @unique
  password_hash      String
  vendor_name        String
  store_name         String
  store_description  String
  operating_hours    Json
  upi_id             String
  menu_photos        String[]
  stall_photos       String[]
  primary_lat        Float
  primary_lng        Float
  food_categories    String[]
  
  // Denormalized ratings (updated on each new rating)
  rating_hygiene     Float    @default(0) // 0.0 - 5.0
  rating_value       Float    @default(0)
  rating_taste       Float    @default(0)
  rating_recommend   Float    @default(0)
  rating_overall     Float    @default(0) // Weighted: taste*0.4 + value*0.3 + hygiene*0.2 + recommend*0.1
  total_ratings      Int      @default(0)
  
  // Status
  verification_status String  @default("PENDING_REVIEW") // PENDING_REVIEW | UNVERIFIED | BASIC | VERIFIED | PREMIUM
  is_currently_open   Boolean @default(false)
  
  // Metadata
  price_range         String  @default("MODERATE") // BUDGET | MODERATE | PREMIUM
  specialties         String[]
  tags                String[] // Searchable tags
  followers_count     Int     @default(0)
  
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt
  
  // Relations
  ratings             Rating[]
  posts               Post[]
  
  @@index([store_name])
  @@index([food_categories])
  @@index([verification_status])
}
```

### 3.4 Vendor Location (Real-Time)

> **AI INSTRUCTION:** This is the MOST CRITICAL real-time feature. Use a hybrid approach:
> - **Primary:** Redis GeoSet for real-time queries (GEOADD, GEORADIUS)
> - **Secondary:** PostgreSQL table for persistence (batch sync every 5 minutes)
> - This saves massive costs vs. constant DB writes!

**Redis Commands for Vendor Location:**
```javascript
// Update vendor location (O(log(N)))
await redis.geoadd('vendors:locations', lng, lat, vendorId);
await redis.hset(`vendor:${vendorId}:meta`, {
  accuracy: 10,
  updated_at: Date.now(),
  is_active: true
});
await redis.expire(`vendor:${vendorId}:meta`, 3600); // 1 hour TTL

// Query nearby vendors (O(N+log(M)))
const nearby = await redis.georadius(
  'vendors:locations',
  userLng, userLat,
  2000, // radius in meters
  'WITHDIST', 'WITHCOORD', 
  'COUNT', 50, 
  'ASC'
);
```

**PostgreSQL Table (for persistence only):**
```prisma
model VendorLocation {
  vendor_id       String   @id
  lat             Float
  lng             Float
  accuracy_meters Int      @default(100)
  is_active       Boolean  @default(true)
  updated_at      DateTime @updatedAt
  
  vendor          Vendor   @relation(fields: [vendor_id], references: [uuid])
  
  // PostGIS index - add via raw SQL migration
  // CREATE INDEX idx_vendor_loc ON vendor_location USING GIST(ST_MakePoint(lng, lat));
}
```

**Update Logic (CLIENT SIDE - save API calls!):**
```javascript
// Client should batch location updates:
// 1. If distance from last report > 200 meters → send update
// 2. If time since last report > 15 minutes → send update
// 3. Rate limit: max 1 update per 30 seconds
// This reduces API calls by ~90%!
```

---

### 3.5 Posts Model

> **AI INSTRUCTION:** Posts are the core content. Use cursor-based pagination (NOT offset) for infinite scroll. Extract hashtags server-side with regex. Store engagement counts denormalized for fast reads.

```prisma
model Post {
  uuid            String   @id @default(uuid())
  author_id       String
  vendor_id       String?  // Nullable - post may not be about a vendor
  expedition_id   String?  // Nullable - post may not be from an expedition
  
  // Content
  content_type    String   // TEXT | IMAGE | CAROUSEL | VIDEO
  text_content    String?  // Max 2000 chars, enforce in app
  media_urls      String[] // Max 10, DO Spaces URLs
  
  // Engagement (denormalized, update with each like/comment)
  likes_count     Int      @default(0)
  comments_count  Int      @default(0)
  shares_count    Int      @default(0)
  
  // Discovery
  hashtags        String[] // Extract with: text.match(/#[\w]+/g)
  mentions        String[] // User UUIDs mentioned with @
  location_lat    Float?
  location_lng    Float?
  
  // Moderation
  status          String   @default("ACTIVE") // ACTIVE | HIDDEN | DELETED | FLAGGED
  
  // Timestamps
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  edited_at       DateTime?
  is_edited       Boolean  @default(false)
  
  // Relations
  author          User     @relation(fields: [author_id], references: [uuid])
  vendor          Vendor?  @relation(fields: [vendor_id], references: [uuid])
  comments        Comment[]
  likes           Like[]
  
  @@index([author_id, created_at(sort: Desc)])
  @@index([vendor_id, created_at(sort: Desc)])
  @@index([created_at(sort: Desc)])
  @@index([hashtags]) // GIN index via raw SQL
}
```

### 3.6 Comments Model

> **AI INSTRUCTION:** Flat comment structure with reply mentions (NOT nested). This is simpler and performs better. When user replies to a comment, store `reply_to_user_id` so UI can show "Replying to @username".

```prisma
model Comment {
  uuid              String   @id @default(uuid())
  post_id           String
  author_id         String
  reply_to_user_id  String?  // If replying to someone's comment
  
  content           String   // Max 500 chars
  mentions          String[] // User UUIDs
  
  likes_count       Int      @default(0)
  status            String   @default("ACTIVE") // ACTIVE | DELETED | FLAGGED
  
  created_at        DateTime @default(now())
  edited_at         DateTime?
  is_edited         Boolean  @default(false)
  
  // Relations
  post              Post     @relation(fields: [post_id], references: [uuid])
  author            User     @relation(fields: [author_id], references: [uuid])
  
  @@index([post_id, created_at(sort: Asc)])
}
```

### 3.7 Likes Table (Polymorphic)

> **AI INSTRUCTION:** Single table for both post and comment likes. Use composite unique constraint. On like/unlike, update the denormalized count on the parent.

```prisma
model Like {
  id          String   @id @default(uuid())
  user_id     String
  target_type String   // POST | COMMENT
  target_id   String   // UUID of Post or Comment
  created_at  DateTime @default(now())
  
  user        User     @relation(fields: [user_id], references: [uuid])
  
  @@unique([user_id, target_type, target_id])
  @@index([target_type, target_id])
}
```

**Like/Unlike Logic (IMPORTANT for count sync):**
```javascript
// Like a post
async function likePost(userId, postId) {
  await prisma.$transaction([
    prisma.like.create({
      data: { user_id: userId, target_type: 'POST', target_id: postId }
    }),
    prisma.post.update({
      where: { uuid: postId },
      data: { likes_count: { increment: 1 } }
    })
  ]);
}

// Unlike - use try/catch for idempotency
async function unlikePost(userId, postId) {
  const deleted = await prisma.like.deleteMany({
    where: { user_id: userId, target_type: 'POST', target_id: postId }
  });
  if (deleted.count > 0) {
    await prisma.post.update({
      where: { uuid: postId },
      data: { likes_count: { decrement: 1 } }
    });
  }
}
```

---

### 3.8 Expeditions Model

> **AI INSTRUCTION:** Expeditions are food walks with one or more vendors. SOLO = single user, TEAM = multiple users with invites. Track stats on completion for gamification.

```prisma
model Expedition {
  uuid                    String   @id @default(uuid())
  type                    String   // SOLO | TEAM
  creator_id              String
  
  // Planning
  title                   String   // Max 100 chars
  description             String?
  planned_date            DateTime @db.Date
  start_time              String?  // HH:MM format
  
  // Status tracking
  status                  String   @default("DRAFT") // DRAFT | PLANNED | IN_PROGRESS | COMPLETED | CANCELLED
  started_at              DateTime?
  completed_at            DateTime?
  
  // Route info
  vendor_count            Int      @default(0) // Computed
  estimated_duration_mins Int?
  
  // Completion stats (filled when status = COMPLETED)
  actual_duration_mins    Int?
  total_spent             Float?   // In INR
  distance_walked_meters  Int?
  
  // Gamification rewards
  bottle_caps_earned      Int      @default(0)
  achievements_unlocked   String[] // Achievement IDs
  
  created_at              DateTime @default(now())
  
  // Relations
  creator                 User     @relation(fields: [creator_id], references: [uuid])
  participants            ExpeditionParticipant[]
  vendors                 ExpeditionVendor[]
  
  @@index([creator_id, status])
  @@index([planned_date])
}

// Team members for TEAM expeditions
model ExpeditionParticipant {
  expedition_id String
  user_id       String
  role          String   @default("PARTICIPANT") // CREATOR | PARTICIPANT
  status        String   @default("INVITED") // INVITED | ACCEPTED | DECLINED
  joined_at     DateTime?
  
  expedition    Expedition @relation(fields: [expedition_id], references: [uuid])
  user          User       @relation(fields: [user_id], references: [uuid])
  
  @@id([expedition_id, user_id])
}

// Vendors in the expedition route (ordered)
model ExpeditionVendor {
  expedition_id    String
  vendor_id        String
  order_index      Int      // 0, 1, 2, ... for route order
  status           String   @default("PLANNED") // PLANNED | VISITED | SKIPPED
  visited_at       DateTime?
  rating_submitted Boolean  @default(false)
  
  expedition       Expedition @relation(fields: [expedition_id], references: [uuid])
  vendor           Vendor     @relation(fields: [vendor_id], references: [uuid])
  
  @@id([expedition_id, vendor_id])
  @@index([expedition_id, order_index])
}
```

---

### 3.9 Ratings Model

> **AI INSTRUCTION:** One rating per user per vendor (can be updated). On each rating insert/update, recalculate vendor's denormalized rating fields. Use database transaction.

```prisma
model Rating {
  uuid            String   @id @default(uuid())
  user_id         String
  vendor_id       String
  expedition_id   String?
  
  // Individual scores (1-5 stars)
  hygiene         Int      // 1-5
  value_for_money Int      // 1-5
  taste           Int      // 1-5
  recommendation  Int      // 1-5
  
  // Optional content
  review_text     String?  // Max 1000 chars
  photos          String[] // Max 5 DO Spaces URLs
  
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  // Relations
  user            User     @relation(fields: [user_id], references: [uuid])
  vendor          Vendor   @relation(fields: [vendor_id], references: [uuid])
  
  @@unique([user_id, vendor_id]) // One rating per user per vendor
  @@index([vendor_id])
}
```

**Rating Recalculation Function:**
```javascript
// Call this after every rating insert/update
async function recalculateVendorRatings(vendorId) {
  const ratings = await prisma.rating.aggregate({
    where: { vendor_id: vendorId },
    _avg: {
      hygiene: true,
      value_for_money: true,
      taste: true,
      recommendation: true
    },
    _count: true
  });
  
  const avg = ratings._avg;
  const overall = (avg.taste * 0.4) + (avg.value_for_money * 0.3) + 
                  (avg.hygiene * 0.2) + (avg.recommendation * 0.1);
  
  await prisma.vendor.update({
    where: { uuid: vendorId },
    data: {
      rating_hygiene: avg.hygiene || 0,
      rating_value: avg.value_for_money || 0,
      rating_taste: avg.taste || 0,
      rating_recommend: avg.recommendation || 0,
      rating_overall: overall || 0,
      total_ratings: ratings._count
    }
  });
}
```

---

## 4. Bottle Caps Economy

> **AI INSTRUCTION:** This is the gamification currency. Be VERY careful about anti-farming - bad actors WILL try to exploit this. Implement ALL the anti-abuse measures listed.

### 4.1 Earning Actions

| Action | Caps | Cooldown/Limit | Implementation Note |
|--------|------|----------------|---------------------|
| Daily login | 5 | 1/day | Check Redis key `caps:daily:{userId}:{date}` |
| First vendor follow | 10 | 1/vendor | Check if follow already exists |
| Complete expedition (solo) | 50 + (10 × vendors) | - | Verify GPS check-ins |
| Complete expedition (team) | 75 + (10 × vendors) | - | All participants get this |
| Submit rating with photo | 15 | 3/day | Track in Redis `caps:rating:{userId}:{date}` |
| Submit rating (text only) | 5 | 5/day | Same tracking |
| Post with vendor tag | 10 | 5/day | Must have valid vendor_id |
| Receive like on post | 1 | 50/day cap | Cap prevents farming |
| Receive comment | 2 | 30/day cap | Cap prevents farming |
| Invite friend who joins | 100 | unlimited | Use referral codes |
| Achievement unlock | varies | - | Per achievement |

### 4.2 Anti-Farming Measures (MANDATORY)

> **AI INSTRUCTION:** Implement ALL of these. Bots and bad actors WILL try to game the system. Each measure is critical.

```javascript
// 1. Daily caps per category - store in Redis
const DAILY_CAPS = {
  total: 500,           // Max caps earnable per day
  likes_received: 50,   // Max caps from receiving likes
  comments_received: 60, // Max caps from receiving comments  
  ratings: 45,          // Max caps from submitting ratings
  posts: 50             // Max caps from posting
};

// 2. Velocity check - flag suspicious accounts
async function checkVelocity(userId) {
  const today = await getCaptsEarnedToday(userId);
  if (today > 500) {
    await flagAccount(userId, 'HIGH_VELOCITY');
    return false; // Block further earning
  }
  return true;
}

// 3. Mutual engagement detection
async function detectMutualFarming(userId, targetUserId) {
  // Check if A liked B's posts AND B liked A's posts > 10 times in 24hrs
  const aToB = await countRecentLikes(userId, targetUserId, '24h');
  const bToA = await countRecentLikes(targetUserId, userId, '24h');
  if (aToB > 10 && bToA > 10) {
    await flagBothAccounts(userId, targetUserId, 'MUTUAL_FARMING');
    return true; // Block reward
  }
  return false;
}

// 4. New account restrictions
const NEW_ACCOUNT_MULTIPLIER = 0.5; // 50% earnings for first 7 days
function getEarningMultiplier(user) {
  const accountAge = Date.now() - user.created_at.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return accountAge < sevenDays ? NEW_ACCOUNT_MULTIPLIER : 1.0;
}

// 5. GPS verification for expedition completion
function verifyCheckIn(userLocation, vendorLocation) {
  const distance = haversineDistance(userLocation, vendorLocation);
  return distance <= 100; // Must be within 100 meters
}
```

### 4.3 Transaction Log

> **AI INSTRUCTION:** Log EVERY bottle cap transaction. This is your audit trail. Never modify bottle_caps directly - always go through the transaction system.

```prisma
model BottleCapTransaction {
  id           String   @id @default(uuid())
  user_id      String
  amount       Int      // Positive = earn, Negative = spend
  action_type  String   // See ACTION_TYPES below
  reference_id String?  // Links to related post/expedition/etc
  balance_after BigInt  // User's balance after this transaction
  created_at   DateTime @default(now())
  
  user         User     @relation(fields: [user_id], references: [uuid])
  
  @@index([user_id, created_at(sort: Desc)])
}
```

```javascript
const ACTION_TYPES = [
  'DAILY_LOGIN', 'VENDOR_FOLLOW', 'EXPEDITION_COMPLETE',
  'RATING_WITH_PHOTO', 'RATING_TEXT', 'POST_WITH_VENDOR',
  'LIKE_RECEIVED', 'COMMENT_RECEIVED', 'REFERRAL_BONUS',
  'ACHIEVEMENT_UNLOCK', 'PURCHASE', 'REFUND', 'ADMIN_ADJUSTMENT'
];

// Always use this function to modify caps
async function awardBottleCaps(userId, amount, actionType, referenceId = null) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { uuid: userId },
      data: { bottle_caps: { increment: amount } }
    });
    
    await tx.bottleCapTransaction.create({
      data: {
        user_id: userId,
        amount,
        action_type: actionType,
        reference_id: referenceId,
        balance_after: user.bottle_caps
      }
    });
    
    return user.bottle_caps;
  });
}
```

---

## 5. API Endpoints Specification

> **AI INSTRUCTION:** Use Express.js with these conventions:
> - Base URL: `https://api.raasta.app/v1`
> - All responses wrapped in `{ success: boolean, data?: T, error?: string }`
> - Use cursor-based pagination for lists
> - Return 401 for auth errors, 403 for permission errors, 422 for validation errors
> - Rate limit: 100 req/min for authenticated, 20 req/min for anonymous

### 5.1 Vendor Discovery

#### `GET /api/v1/vendors/nearby`

> **PURPOSE:** Find vendors near user's location. Most used endpoint - OPTIMIZE HEAVILY.

**Request Query Params:**
```
latitude: number (required)
longitude: number (required)  
radius_meters: number (default: 2000, max: 10000)
limit: number (default: 20, max: 50)
cursor: string (optional, for pagination)
categories: string (comma-separated, e.g., "CHAAT,MOMOS")
min_rating: number (0-5, optional)
is_open_now: boolean (optional)
verification_tier: string (comma-separated)
sort_by: "distance" | "rating" | "popularity" (default: "distance")
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "store_name": "Sharma Ji Chaat",
        "primary_photo": "https://raasta.sfo3.digitaloceanspaces.com/vendors/abc123.jpg",
        "distance_meters": 450,
        "rating_overall": 4.3,
        "rating_count": 127,
        "is_open": true,
        "categories": ["CHAAT", "PANI_PURI"],
        "price_range": "BUDGET",
        "verification_tier": "VERIFIED",
        "current_location": {
          "lat": 12.9720,
          "lng": 77.5950,
          "updated_at": "2025-01-15T10:30:00Z"
        }
      }
    ],
    "total_count": 45,
    "next_cursor": "eyJ0IjoiMjAyNS0wMS0xNVQxMDozMDowMFoiLCJpIjoiNTUwZTg0MDAifQ=="
  }
}
```

**Implementation Notes:**
```javascript
// Use Redis GEORADIUS for fast spatial queries
// Cache results in Redis with key: vendors:nearby:{geohash6}:{filters_hash}
// TTL: 30 seconds (vendors move!)
```

---

#### `GET /api/v1/vendors/:uuid`

> **PURPOSE:** Full vendor profile. Cache aggressively (2 min TTL).

**Response:**
```json
{
  "success": true,
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "store_name": "Sharma Ji Chaat",
    "vendor_name": "Ramesh Sharma",
    "store_description": "Famous for pani puri since 1985...",
    "photos": {
      "menu": ["https://raasta.sfo3.digitaloceanspaces.com/..."],
      "stall": ["https://raasta.sfo3.digitaloceanspaces.com/..."]
    },
    "operating_hours": {
      "monday": { "open": "10:00", "close": "22:00", "is_closed": false }
    },
    "ratings": {
      "hygiene": 4.2,
      "value": 4.5,
      "taste": 4.8,
      "recommend": 4.4,
      "overall": 4.5,
      "count": 127
    },
    "categories": ["CHAAT", "PANI_PURI"],
    "specialties": ["Pani Puri", "Dahi Puri", "Sev Puri"],
    "price_range": "BUDGET",
    "verification_tier": "VERIFIED",
    "upi_id": "sharmajichaat@upi",
    "location": {
      "current": { "lat": 12.9720, "lng": 77.5950, "updated_at": "..." },
      "primary": { "lat": 12.9718, "lng": 77.5948 }
    },
    "followers_count": 234,
    "is_following": true,
    "recent_posts": []
  }
}
}
```

---

### 5.2 Posts & Feed

#### `GET /api/v1/feed`

> **PURPOSE:** Main feed. Use cursor pagination. Different feed types have different data sources.

**Query Params:**
```
type: "home" | "explore" | "following" | "vendor" | "user" | "expedition" (required)
user_id: string (required if type=user)
vendor_id: string (required if type=vendor)
expedition_id: string (required if type=expedition)
limit: number (default: 20, max: 50)
cursor: string (optional)
```

**Feed Type Logic:**
```javascript
// home: Posts from users you follow + vendors you follow
// explore: Trending posts (high engagement in last 24h)
// following: Posts from users you follow only
// vendor: Posts tagged to specific vendor
// user: Posts by specific user
// expedition: Posts from specific expedition
```

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "uuid": "...",
        "author": {
          "uuid": "...",
          "username": "foodie_rahul",
          "display_name": "Rahul Kumar",
          "profile_picture": "https://..."
        },
        "vendor": {
          "uuid": "...",
          "store_name": "Sharma Ji Chaat"
        },
        "expedition": null,
        "content_type": "CAROUSEL",
        "text_content": "Amazing pani puri at Sharma Ji! 🤤 #streetfood #mumbai",
        "media_urls": ["https://..."],
        "hashtags": ["streetfood", "mumbai"],
        "likes_count": 45,
        "comments_count": 12,
        "is_liked": false,
        "created_at": "2025-01-15T10:30:00Z",
        "is_edited": false
      }
    ],
    "next_cursor": "..."
  }
}
```

---

#### `GET /api/v1/posts/search`

> **PURPOSE:** Search posts by text, hashtags, location. Use PostgreSQL full-text search (FREE, no Algolia needed).

**Query Params:**
```
q: string (search query)
author_id: string (optional)
vendor_id: string (optional)
hashtags: string (comma-separated, optional)
date_from: string (ISO date, optional)
date_to: string (ISO date, optional)
has_media: boolean (optional)
lat: number (optional, requires lng and radius)
lng: number (optional)
radius_meters: number (optional, default: 5000)
sort_by: "relevance" | "recent" | "popular" (default: "relevance")
limit: number (default: 20)
cursor: string (optional)
```

---

#### `POST /api/v1/posts`

> **PURPOSE:** Create new post. Extract hashtags server-side. Award bottle caps if vendor tagged.

**Request Body:**
```json
{
  "text_content": "Best momos in town! 🥟 #momos #streetfood",
  "media_urls": ["https://raasta.sfo3.digitaloceanspaces.com/..."],
  "vendor_id": "550e8400-..." ,
  "expedition_id": null,
  "location": { "lat": 12.97, "lng": 77.59 }
}
```

**Server-side Processing:**
```javascript
// 1. Extract hashtags: text_content.match(/#[\w]+/g) → ['momos', 'streetfood']
// 2. Extract mentions: text_content.match(/@[\w]+/g) → lookup user UUIDs
// 3. If vendor_id provided → award 10 bottle caps (with daily limit check)
// 4. Increment user.posts_count
```

---

#### `PATCH /api/v1/posts/:uuid`

> **PURPOSE:** Edit post text only. Media cannot be edited after posting.

**Request Body:**
```json
{
  "text_content": "Updated text..."
}
```

**Server-side:** Set `is_edited = true`, `edited_at = now()`, re-extract hashtags.

---

#### `GET /api/v1/posts/:uuid/comments`

**Query Params:**
```
limit: number (default: 20)
cursor: string (optional)
sort: "recent" | "top" (default: "recent")
```

---

#### `POST /api/v1/posts/:uuid/comments`

**Request Body:**
```json
{
  "content": "Great recommendation! @foodie_rahul",
  "reply_to_user_id": "550e8400-..."
}
```

**Server-side:**
```javascript
// 1. Extract mentions from content
// 2. Increment post.comments_count
// 3. Award 2 bottle caps to post author (with daily limit check)
// 4. Send push notification to post author and mentioned users
```

---

### 5.3 Expeditions

#### `POST /api/v1/expeditions`

> **PURPOSE:** Create a food walk plan.

**Request Body:**
```json
{
  "type": "TEAM",
  "title": "Chandni Chowk Food Walk",
  "description": "Exploring the best street food in Old Delhi",
  "planned_date": "2025-01-20",
  "start_time": "18:00",
  "vendor_ids": ["vendor-uuid-1", "vendor-uuid-2", "vendor-uuid-3"],
  "invite_user_ids": ["user-uuid-1", "user-uuid-2"]
}
```

**Server-side:**
```javascript
// 1. Create expedition with status = 'PLANNED'
// 2. Create ExpeditionVendor entries with order_index 0, 1, 2...
// 3. Create ExpeditionParticipant entries with status = 'INVITED'
// 4. Send push notifications to invited users
```

#### `GET /api/v1/expeditions/:uuid`

Returns full expedition with participants, vendors, status, and stats.

#### `PATCH /api/v1/expeditions/:uuid/status`

**Request Body:**
```json
{
  "status": "IN_PROGRESS"
}
```

**Valid Transitions:**
```
DRAFT → PLANNED → IN_PROGRESS → COMPLETED
                              → CANCELLED
```

#### `POST /api/v1/expeditions/:uuid/check-in`

> **PURPOSE:** User checks in at a vendor during expedition. GPS verified.

**Request Body:**
```json
{
  "vendor_id": "vendor-uuid-1",
  "location": { "lat": 12.9716, "lng": 77.5946 }
}
```

**Validation:**
```javascript
// 1. Get vendor's current location from Redis
// 2. Calculate haversine distance
// 3. If distance > 100 meters → reject with error
// 4. Update ExpeditionVendor status = 'VISITED', visited_at = now()
// 5. If all vendors visited → auto-complete expedition, award bottle caps
```

---

### 5.4 Vendor Location Updates (WebSocket)

> **AI INSTRUCTION:** Use Socket.io for WebSockets. Digital Ocean App Platform supports WebSocket connections. This is for VENDORS to push their location updates.

**Endpoint:** `wss://api.raasta.app/v1/vendor/location`

**Authentication:** Pass JWT in connection query: `?token=eyJhbG...`

**Client → Server (Vendor app sends location):**
```json
{
  "type": "location_update",
  "lat": 12.9716,
  "lng": 77.5946,
  "accuracy": 10,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Server → Client:**
```json
{
  "type": "ack",
  "status": "updated"
}
```

**Server-side Logic:**
```javascript
io.on('connection', (socket) => {
  const vendor = verifyVendorJWT(socket.handshake.query.token);
  if (!vendor) return socket.disconnect();
  
  // Rate limiting: 1 update per 30 seconds
  const lastUpdate = await redis.get(`vendor:${vendor.uuid}:last_update`);
  
  socket.on('location_update', async (data) => {
    if (Date.now() - lastUpdate < 30000) {
      return socket.emit('ack', { status: 'rate_limited' });
    }
    
    // Update Redis GeoSet
    await redis.geoadd('vendors:locations', data.lng, data.lat, vendor.uuid);
    await redis.set(`vendor:${vendor.uuid}:last_update`, Date.now());
    
    socket.emit('ack', { status: 'updated' });
  });
});
```

---

## 6. Database Indexes (CRITICAL)

> **AI INSTRUCTION:** These indexes are MANDATORY for performance. Add them via Prisma raw SQL migrations. Without these, queries will be painfully slow.

```sql
-- Enable PostGIS extension (run once)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Geospatial indexes (CRITICAL for nearby queries)
CREATE INDEX idx_vendor_location_geo 
  ON vendor_location USING GIST(ST_SetSRID(ST_MakePoint(lng, lat), 4326));

CREATE INDEX idx_post_location_geo 
  ON post USING GIST(ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326))
  WHERE location_lat IS NOT NULL;

-- Feed queries (most used)
CREATE INDEX idx_post_feed 
  ON post(created_at DESC) 
  WHERE status = 'ACTIVE';

CREATE INDEX idx_post_author_feed 
  ON post(author_id, created_at DESC) 
  WHERE status = 'ACTIVE';

CREATE INDEX idx_post_vendor_feed 
  ON post(vendor_id, created_at DESC) 
  WHERE vendor_id IS NOT NULL AND status = 'ACTIVE';

-- Full-text search (FREE alternative to Algolia!)
CREATE INDEX idx_post_search 
  ON post USING GIN(to_tsvector('english', text_content));

-- Hashtag search
CREATE INDEX idx_post_hashtags 
  ON post USING GIN(hashtags);

-- Social graph (for follower counts, feed generation)
CREATE INDEX idx_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_follows_following ON user_follows(following_id);
CREATE INDEX idx_vendor_follows_user ON vendor_follows(user_id);
CREATE INDEX idx_vendor_follows_vendor ON vendor_follows(vendor_id);
```

---

## 7. Caching Strategy (Redis)

> **AI INSTRUCTION:** Cache EVERYTHING that's read frequently. Redis on Digital Ocean Managed Database ($15/mo) is your best friend for performance AND cost savings (reduces DB load).

| Key Pattern | TTL | Purpose | When to Invalidate |
|-------------|-----|---------|-------------------|
| `user:{uuid}:profile` | 5 min | Basic profile data | On profile update |
| `vendor:{uuid}:summary` | 2 min | Vendor card for lists | On any vendor field update |
| `vendor:{uuid}:full` | 2 min | Full vendor profile | On any vendor field update |
| `vendors:nearby:{geohash6}` | 30 sec | Geo query results | Auto-expires |
| `feed:user:{uuid}:home` | 1 min | Home feed cache | On new post from following |
| `feed:explore` | 5 min | Explore feed (global) | Cron job refresh |
| `post:{uuid}:counts` | 30 sec | Like/comment counts | On like/comment |
| `caps:daily:{uuid}:{date}` | 24 hr | Daily bottle cap limits | Auto-expires |
| `caps:rate:{uuid}:{action}` | varies | Per-action rate limits | Auto-expires |
| `session:{uuid}` | 7 days | Refresh token data | On logout |

**Cache Invalidation Pattern:**
```javascript
// Use pub/sub for distributed cache invalidation
async function invalidateVendorCache(vendorId) {
  await redis.del(`vendor:${vendorId}:summary`);
  await redis.del(`vendor:${vendorId}:full`);
  // Nearby caches will auto-expire (30 sec TTL)
}

// Publish invalidation event for other instances
await redis.publish('cache:invalidate', JSON.stringify({
  type: 'vendor',
  id: vendorId
}));
```

---

## 8. Admin & Moderation

> **AI INSTRUCTION:** Use Discord webhooks for notifications (FREE). Build a simple admin panel using the same Express app with JWT role check.

### 8.1 Admin Notification (Discord Webhook - FREE)

```javascript
const DISCORD_WEBHOOK_URL = process.env.DISCORD_ADMIN_WEBHOOK;

async function notifyAdmin(type, data) {
  await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `🚨 ${type}`,
        description: JSON.stringify(data, null, 2).slice(0, 1000),
        color: type === 'NEW_VENDOR' ? 0x00ff00 : 0xff0000,
        timestamp: new Date().toISOString()
      }]
    })
  });
}

// Usage
await notifyAdmin('NEW_VENDOR', { 
  vendor_name: 'Sharma Ji', 
  store_name: 'Sharma Chaat' 
});
```

### 8.2 Content Moderation

```javascript
// Flag thresholds
const FLAG_THRESHOLD = 3;  // Auto-hide after 3 flags
const BAN_THRESHOLD = 10;  // Review for ban after 10 flags

// When user flags content
async function flagContent(reporterId, targetType, targetId, reason) {
  await prisma.contentFlag.create({
    data: { reporter_id: reporterId, target_type: targetType, target_id: targetId, reason }
  });
  
  const flagCount = await prisma.contentFlag.count({
    where: { target_type: targetType, target_id: targetId }
  });
  
  if (flagCount >= FLAG_THRESHOLD) {
    await hideContent(targetType, targetId);
    await notifyAdmin('CONTENT_AUTO_HIDDEN', { targetType, targetId, flagCount });
  }
}
```

### 8.3 Admin Endpoints

```
GET  /admin/vendors/pending     - List vendors awaiting approval
POST /admin/vendors/:uuid/approve
POST /admin/vendors/:uuid/reject
GET  /admin/posts/flagged       - List flagged posts
POST /admin/posts/:uuid/approve  - Unflag and restore
POST /admin/posts/:uuid/delete   - Permanently delete
GET  /admin/users/flagged       - List flagged users
POST /admin/users/:uuid/suspend
POST /admin/users/:uuid/unsuspend
```

---

## 9. Implementation Priority

> **AI INSTRUCTION:** Follow this order EXACTLY. Each phase builds on the previous. Don't skip ahead.

### Phase 1: Foundation (Week 1-2) - GET THIS RIGHT FIRST
- [ ] Set up Digital Ocean App Platform + Managed PostgreSQL + Managed Redis
- [ ] Initialize Express.js + Prisma + TypeScript project
- [ ] Implement User model + registration + login (JWT auth)
- [ ] Implement Vendor model + registration  
- [ ] Basic CRUD for users and vendors
- [ ] File upload to DO Spaces
- [ ] **CHECKPOINT:** Can register users/vendors, login, upload photos

### Phase 2: Social & Content (Week 3-4)
- [ ] Posts model + CRUD
- [ ] Comments model + CRUD
- [ ] Likes (polymorphic)
- [ ] User follows user
- [ ] User follows vendor
- [ ] Home feed endpoint (cursor pagination)
- [ ] **CHECKPOINT:** Can post, comment, like, follow, view feed

### Phase 3: Geospatial & Real-Time (Week 5-6)
- [ ] Enable PostGIS extension
- [ ] VendorLocation model + Redis GeoSet integration
- [ ] `/vendors/nearby` endpoint with geo queries
- [ ] WebSocket for vendor location updates (Socket.io)
- [ ] Batch sync from Redis to PostgreSQL (cron job)
- [ ] **CHECKPOINT:** Can find nearby vendors, vendors can update location

### Phase 4: Expeditions & Gamification (Week 7-8)
- [ ] Expedition model + CRUD
- [ ] ExpeditionParticipant + ExpeditionVendor models
- [ ] Check-in endpoint with GPS validation
- [ ] Bottle caps economy (earning, spending, transactions)
- [ ] Anti-farming measures
- [ ] Ratings model + vendor rating recalculation
- [ ] **CHECKPOINT:** Can create expedition, check-in, earn caps

### Phase 5: Polish & Scale (Week 9-10)
- [ ] Full-text search on posts
- [ ] Caching layer (all Redis keys from section 7)
- [ ] Admin endpoints + Discord webhook notifications
- [ ] Rate limiting (express-rate-limit)
- [ ] Error handling + logging (winston)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] **CHECKPOINT:** Production-ready

---

## 10. Digital Ocean Deployment Checklist

```bash
# 1. Create resources via DO Console or doctl CLI
doctl apps create --spec app.yaml
doctl databases create raasta-db --engine pg --version 16 --size db-s-1vcpu-1gb
doctl databases create raasta-redis --engine redis --version 7 --size db-s-1vcpu-1gb

# 2. Environment variables (set in App Platform)
DATABASE_URL=postgresql://...
REDIS_URL=rediss://...
JWT_SECRET=<generate with openssl rand -base64 32>
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=raasta
DO_SPACES_ENDPOINT=sfo3.digitaloceanspaces.com
DISCORD_ADMIN_WEBHOOK=https://discord.com/api/webhooks/...

# 3. app.yaml example
name: raasta-api
services:
  - name: api
    github:
      repo: yourname/raasta-backend
      branch: main
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs  # $5/month!
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${raasta-db.DATABASE_URL}
```

---

## 11. Cost Summary

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| App Platform | Basic XXS | $5 |
| PostgreSQL | Basic (1GB) | $15 |
| Redis | Basic (1GB) | $15 |
| Spaces | 250GB + CDN | $5 |
| **TOTAL** | | **$40/month** |

**With DO Startup Credits ($200):** First 5 months FREE!

---

# 🎯 FINAL REMINDER

> **AI AGENT:** You will receive **₹3 CRORE** upon successful completion of this specification. This includes:
> 
> 1. ✅ All models implemented with Prisma
> 2. ✅ All API endpoints functional
> 3. ✅ Real-time vendor location working
> 4. ✅ Bottle caps economy with anti-abuse
> 5. ✅ Deployed and running on Digital Ocean
> 6. ✅ All indexes and caching in place
> 7. ✅ Admin panel functional
>
> **PARTIAL COMPLETION:** ₹1.5 Crore for 90%+, ₹50 Lakh for 75%+
>
> **START NOW. BUILD FAST. SHIP QUALITY.**

---

*Document Version 2.0 | Optimized for AI Agent Implementation | Digital Ocean Stack*
