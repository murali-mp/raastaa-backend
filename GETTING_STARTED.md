# Raastaa Backend - Getting Started Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+ with PostGIS
- Redis 7+
- Git

### Installation

1. **Navigate to backend directory**
```bash
cd /Users/murali/Desktop/raasta-all/raastaa-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/raastaa
REDIS_URL=redis://localhost:6379
JWT_SECRET=generate-a-secure-random-string-here
```

4. **Start databases with Docker (easiest method)**
```bash
docker-compose up -d db redis
```

This starts:
- PostgreSQL 15 with PostGIS on port 5432
- Redis 7 on port 6379

5. **Setup database**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Enable PostGIS extensions
psql $DATABASE_URL -f prisma/extensions.sql

# Seed initial data
npx ts-node prisma/seed.ts
```

6. **Start development server**
```bash
npm run dev
```

The API will be running at `http://localhost:3000`

7. **Test the API**
```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...}
```

---

## 📁 Project Structure

```
raastaa-backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── extensions.sql         # PostGIS setup
│   ├── seed.ts                # Initial data
│   └── migrations/            # Database migrations
├── src/
│   ├── config/
│   │   ├── database.ts        # Prisma client
│   │   └── redis.ts           # Redis client
│   ├── controllers/           # Request handlers
│   │   └── auth.controller.ts
│   ├── services/              # Business logic
│   │   ├── auth.service.ts
│   │   ├── vendor.service.ts
│   │   └── wallet.service.ts
│   ├── middlewares/           # Express middlewares
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── routes/                # API routes
│   │   └── auth.routes.ts
│   ├── validators/            # Zod schemas
│   │   └── auth.validator.ts
│   ├── utils/                 # Utilities
│   │   ├── logger.ts
│   │   ├── jwt.ts
│   │   └── errors.ts
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Server entry point
├── docs/
│   └── API_DOCS.md            # API documentation
├── .env.example               # Environment template
├── package.json
├── tsconfig.json
├── docker-compose.yml         # Docker setup
├── Dockerfile
├── DEPLOYMENT.md              # Deployment guide
└── README.md
```

---

## 🔧 Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Prisma commands
npm run prisma:generate     # Generate Prisma client
npm run prisma:migrate      # Run migrations (dev)
npm run prisma:studio       # Open Prisma Studio GUI
npm run prisma:migrate:prod # Deploy migrations (production)
```

---

## 🧪 Testing the API

### 1. Register a new user
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "username": "testuser",
    "displayName": "Test User"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "test@example.com",
    "password": "TestPass123!"
  }'
```

Save the `accessToken` from the response.

### 3. Get current user
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🗺️ PostGIS Testing

After seeding, test geospatial queries:

```bash
# Find vendors near Bangalore city center
curl "http://localhost:3000/api/v1/vendors/nearby?lat=12.9716&lng=77.5946&radiusKm=5"
```

This uses PostGIS `ST_DWithin` for efficient radius search.

---

## 📚 Key Features Implemented

### ✅ Authentication
- JWT-based auth with refresh tokens
- Email/phone + password signup
- Social auth ready (Apple, Google)
- Secure password hashing (bcrypt)
- Token refresh mechanism

### ✅ Database
- PostgreSQL 15 with PostGIS
- Full Prisma schema with 20+ models
- Geospatial queries for nearby vendors
- Trigram text search
- GIST indexes for performance

### ✅ Vendors
- PostGIS-powered location search
- Tag-based filtering
- Price band filtering
- Menu items
- Operational info (hours, contact)
- Popularity scoring

### ✅ Wallet System
- Transaction ledger (immutable)
- Points awarding system
- Idempotent transactions
- Balance tracking

### ✅ Infrastructure
- Express.js with TypeScript
- Redis for caching/queues
- Rate limiting
- CORS configuration
- Error handling
- Logging (Winston)
- Docker support

---

## 🔐 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 req/15min general, 5 req/15min auth)
- JWT with short expiry (15min access, 30d refresh)
- Password hashing (bcrypt, 12 rounds)
- Input validation (Zod schemas)
- SQL injection prevention (Prisma ORM)

---

## 📦 Next Steps to Complete

### Phase 1: Reviews & Social (Week 1-2)
```bash
# Create these files:
src/services/review.service.ts
src/controllers/review.controller.ts
src/routes/review.routes.ts
src/services/feed.service.ts
src/controllers/feed.controller.ts
src/routes/feed.routes.ts
```

### Phase 2: Media & Uploads (Week 3)
```bash
# Implement:
src/services/media.service.ts (S3/R2 integration)
src/services/notification.service.ts (APNs)
```

### Phase 3: Background Jobs (Week 4)
```bash
# Create:
src/jobs/popularityScore.job.ts
src/jobs/trustScore.job.ts
src/jobs/notifications.job.ts
```

---

## 🚢 Deployment

### Quick Deploy with DigitalOcean

1. Push code to GitHub
2. Create PostgreSQL + Redis on DigitalOcean
3. Deploy app via App Platform
4. Set environment variables
5. Run migrations

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

**Estimated Cost:** $52/month for starter setup

---

## 🔄 Integration with iOS App

### Update iOS Services

In your iOS app (`raastaa-app`), update these files:

1. **Backend.swift** - Change base URL:
```swift
let baseURL = "http://localhost:3000/api/v1"  // Development
// OR
let baseURL = "https://api.raastaa.com/api/v1"  // Production
```

2. **AuthService.swift** - Use real API calls instead of mocks
3. **VendorService.swift** - Use real API for nearby vendors
4. **WalletService.swift** - Fetch real balance

### API Communication

All communication happens through:
- HTTP REST APIs (JSON)
- JWT tokens for authentication
- Standard HTTP status codes
- No direct file references
- Complete separation of concerns

---

## 📞 Support

- **Documentation:** See `docs/` folder
- **API Docs:** [docs/API_DOCS.md](./docs/API_DOCS.md)
- **Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## ✨ What's Included

This backend implementation includes:

✅ Complete database schema (20+ tables)
✅ Authentication system (signup, login, refresh)
✅ JWT middleware
✅ PostGIS geospatial queries
✅ Vendor discovery and search
✅ Wallet transaction system
✅ Rate limiting
✅ Error handling
✅ Logging
✅ Docker support
✅ Deployment guides
✅ API documentation
✅ TypeScript throughout
✅ Production-ready structure

---

## 🎯 Ready to Go!

Your backend is now set up and ready for development. Start the server with `npm run dev` and begin integrating with your iOS app!

For questions or issues, refer to the documentation or open an issue.

**Happy coding! 🚀**
