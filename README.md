# Raastaa Backend 🍜

> Gamified street food discovery platform for India - Backend API

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 15+ with PostGIS
- **ORM**: Prisma 5
- **Cache**: Redis 7
- **Storage**: Digital Ocean Spaces (S3-compatible)
- **Real-time**: Socket.io for vendor tracking

## Project Structure

```
raastaa-backend/
├── prisma/
│   └── schema.prisma        # Database schema (20+ models)
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.ts      # Prisma client
│   │   ├── redis.ts         # Redis client & helpers
│   │   ├── s3.ts            # Digital Ocean Spaces
│   │   └── env.ts           # Environment validation
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # JWT authentication
│   │   ├── rateLimiter.ts   # Rate limiting
│   │   ├── validator.ts     # Zod validation
│   │   └── error.ts         # Error handling
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication (OTP, JWT)
│   │   ├── users/           # User profiles, settings
│   │   ├── vendors/         # Vendor management
│   │   ├── social/          # Friends, follows
│   │   ├── posts/           # User-generated content
│   │   ├── comments/        # Post comments
│   │   ├── expeditions/     # Gamified challenges
│   │   ├── ratings/         # Vendor ratings
│   │   ├── bottlecaps/      # Virtual currency
│   │   ├── uploads/         # Media handling
│   │   ├── notifications/   # Push notifications
│   │   ├── admin/           # Admin dashboard
│   │   └── websocket/       # Real-time tracking
│   ├── utils/               # Utility functions
│   ├── app.ts               # Express app setup
│   └── server.ts            # Server entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with PostGIS extension
- Redis 7+
- Digital Ocean Spaces bucket

### Environment Setup

```bash
cp .env.example .env
# Fill in your environment variables
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/raastaa
DIRECT_URL=postgresql://user:pass@localhost:5432/raastaa

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key

# Digital Ocean Spaces
DO_SPACES_KEY=your-key
DO_SPACES_SECRET=your-secret
DO_SPACES_BUCKET=raastaa
DO_SPACES_REGION=blr1
DO_SPACES_ENDPOINT=https://blr1.digitaloceanspaces.com

# OTP Provider (MSG91)
MSG91_AUTH_KEY=your-key
MSG91_TEMPLATE_ID=your-template-id

# Discord Webhooks (optional)
DISCORD_WEBHOOK_LOGS=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_ALERTS=https://discord.com/api/webhooks/...
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Build
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/request-otp` - Request OTP
- `POST /api/auth/verify-otp` - Verify OTP & login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/me` - Current user profile
- `PATCH /api/users/me` - Update profile
- `GET /api/users/:userId` - Get user profile
- `GET /api/users/:userId/posts` - User's posts
- `GET /api/users/:userId/expeditions` - User's expeditions

### Vendors
- `GET /api/vendors/search` - Search vendors
- `GET /api/vendors/nearby` - Nearby live vendors
- `GET /api/vendors/:vendorId` - Vendor details
- `POST /api/vendors/me/go-live` - Go live (vendor)
- `POST /api/vendors/me/go-offline` - Go offline (vendor)

### Social
- `POST /api/social/friends/request` - Send friend request
- `POST /api/social/friends/respond` - Accept/reject request
- `POST /api/social/follow/:userId` - Follow user
- `POST /api/social/vendors/:vendorId/follow` - Follow vendor

### Posts
- `GET /api/posts/feed` - Feed
- `POST /api/posts` - Create post
- `POST /api/posts/:postId/like` - Like post
- `POST /api/posts/:postId/save` - Save post

### Expeditions
- `GET /api/expeditions` - List expeditions
- `POST /api/expeditions/:expeditionId/join` - Join expedition
- `POST /api/expeditions/:expeditionId/checkpoints/:checkpointId/check-in` - Check in

### Ratings
- `POST /api/ratings` - Create rating
- `GET /api/vendors/:vendorId/ratings` - Vendor ratings

### BottleCaps
- `GET /api/bottlecaps/balance` - Get balance
- `GET /api/bottlecaps/history` - Transaction history
- `POST /api/bottlecaps/gift` - Gift to user

### Admin
- `GET /api/admin/vendors/pending` - Pending vendors
- `POST /api/admin/vendors/:vendorId/verify` - Verify vendor
- `GET /api/admin/flags` - Content flags

## WebSocket Events

### Client → Server
- `vendor:location` - Update vendor location
- `subscribe:vendor` - Subscribe to vendor updates

### Server → Client
- `vendor:location:update` - Vendor moved
- `vendor:went-offline` - Vendor went offline

## Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Database GUI
npx prisma studio
```

## Database Models

- **User** - User accounts with gamification stats
- **Vendor** - Street food vendor profiles
- **Post** - User-generated content
- **Comment** - Post comments
- **Rating** - Vendor ratings with photo proofs
- **Expedition** - Gamified group challenges
- **ExpeditionCheckpoint** - Expedition waypoints
- **Friendship** - Social connections
- **VendorFollows** - Vendor subscriptions
- **MenuItem** - Vendor menu items
- **BottleCapTransaction** - Virtual currency ledger
- **Notification** - Push notifications
- **ContentFlag** - Moderation reports

## License

Private - Raastaa Technologies

---

Built with ❤️ for Indian street food lovers
