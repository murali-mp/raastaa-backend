# Raastaa Backend API

Backend API server for Raastaa - A location-based food vendor discovery iOS application.

## Features

- 🗺️ **PostGIS-powered geospatial queries** for nearby vendor discovery
- 🔐 **JWT-based authentication** with refresh tokens
- 💰 **Wallet system** with transaction ledger and points
- 🎯 **Gamification** with challenges and rewards
- 📸 **Media management** with S3/R2 integration
- 🔔 **Push notifications** via Apple Push Notification service
- 👥 **Social features** - follow, feed, likes, comments
- ⭐ **Reviews & ratings** with multi-dimensional scoring
- 🛡️ **Content moderation** and trust scoring
- 📍 **Visit verification** with GPS, QR, and receipt methods

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.3
- **Framework:** Express.js
- **Database:** PostgreSQL 15+ with PostGIS extension
- **ORM:** Prisma
- **Cache:** Redis
- **Storage:** AWS S3 / CloudFlare R2
- **Notifications:** Apple Push Notification service (APNs)
- **Background Jobs:** Bull (Redis-backed queue)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+ with PostGIS extension
- Redis 7+
- AWS S3 account or CloudFlare R2
- Apple Developer account (for APNs)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed initial data (optional)
npx ts-node prisma/seed.ts
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run prisma:studio` - Open Prisma Studio GUI
- `npm run prisma:migrate` - Run database migrations
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## Project Structure

```
raastaa-backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration files
│   └── seed.ts                # Initial data seeding
├── src/
│   ├── config/                # Configuration files
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── s3.ts
│   ├── controllers/           # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── vendor.controller.ts
│   │   ├── review.controller.ts
│   │   ├── feed.controller.ts
│   │   ├── wallet.controller.ts
│   │   └── ...
│   ├── services/              # Business logic
│   │   ├── auth.service.ts
│   │   ├── vendor.service.ts
│   │   ├── notification.service.ts
│   │   ├── media.service.ts
│   │   └── ...
│   ├── middlewares/           # Express middlewares
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── routes/                # API routes
│   │   ├── auth.routes.ts
│   │   ├── vendor.routes.ts
│   │   └── index.ts
│   ├── validators/            # Zod schemas
│   │   ├── auth.validator.ts
│   │   └── vendor.validator.ts
│   ├── jobs/                  # Background jobs
│   │   ├── popularityScore.job.ts
│   │   ├── trustScore.job.ts
│   │   └── notifications.job.ts
│   ├── utils/                 # Utilities
│   │   ├── logger.ts
│   │   ├── jwt.ts
│   │   └── errors.ts
│   ├── types/                 # TypeScript types
│   │   └── express.d.ts
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Server entry point
├── tests/                     # Test files
├── .env.example               # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Key Endpoints

#### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user profile

#### Vendors
- `GET /vendors/nearby` - Find vendors near coordinates
- `GET /vendors/:id` - Get vendor details
- `GET /vendors/:id/reviews` - Get vendor reviews
- `POST /vendors` - Create vendor (admin/owner)

#### Reviews
- `POST /reviews` - Create review
- `PUT /reviews/:id` - Update review
- `POST /reviews/:id/helpful` - Mark review as helpful

#### Feed
- `GET /feed` - Get personalized feed
- `POST /feed/posts` - Create post
- `POST /feed/posts/:id/like` - Like post
- `POST /feed/posts/:id/comments` - Add comment

#### Wallet
- `GET /wallet` - Get wallet balance
- `GET /wallet/transactions` - Get transaction history

#### Challenges
- `GET /challenges` - Get active challenges
- `POST /challenges/:id/claim` - Claim challenge reward

For complete API documentation, see [API_DOCS.md](./docs/API_DOCS.md)

## Database Schema

The database uses PostgreSQL with PostGIS extension for geospatial queries. Key tables include:

- `users` - User accounts with trust scores
- `auth_identities` - Multi-provider authentication
- `locations` - Geographic coordinates with PostGIS geometry
- `vendors` - Food vendors with operational info
- `reviews` - User reviews with multi-dimensional ratings
- `feed_posts` - Social feed posts
- `wallets` - User wallet balances
- `wallet_transactions` - Immutable transaction ledger
- `challenges` - Gamification challenges
- `notifications` - Push notification history

See [prisma/schema.prisma](./prisma/schema.prisma) for complete schema.

## Deployment

### DigitalOcean App Platform (Recommended)

1. Push code to GitHub
2. Create new App in DigitalOcean
3. Connect GitHub repository
4. Configure environment variables
5. Deploy

### Manual Deployment

```bash
# Build
npm run build

# Start production server
npm start
```

## Environment Variables

See [.env.example](./.env.example) for all available configuration options.

Critical variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT signing
- `S3_*` - S3/R2 credentials
- `APNS_*` - Apple Push Notification credentials

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.ts
```

## Monitoring

- **Health Check:** `GET /health`
- **Metrics:** Integration with Prometheus (optional)
- **Logging:** Winston logger with file rotation
- **Error Tracking:** Sentry integration (optional)

## Security

- All passwords hashed with bcrypt (12 rounds)
- JWT tokens with short expiry (15min access, 30d refresh)
- Rate limiting on all endpoints
- HTTPS enforced in production
- SQL injection prevention via Prisma ORM
- Input validation with Zod schemas
- CORS configured for iOS app only

## Performance

- Database connection pooling (5-25 connections)
- Redis caching for frequently accessed data
- Cursor-based pagination for feeds
- GIST indexes for geospatial queries
- Trigram indexes for text search
- Background jobs for heavy operations

## License

MIT

## Support

For questions or issues, please contact the development team or open an issue on GitHub.

## Related Projects

- [raastaa-app](../raastaa-app) - iOS SwiftUI application
