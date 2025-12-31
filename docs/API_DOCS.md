# API Documentation

## Base URL
```
Production: https://api.raastaa.com/api/v1
Development: http://localhost:3000/api/v1
```

## Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### POST /auth/signup
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe",
  "displayName": "John Doe"
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "user@example.com",
      "displayName": "John Doe",
      "trustScore": 100,
      "status": "ACTIVE",
      "createdAt": "2025-12-31T10:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt...",
      "refreshToken": "jwt...",
      "expiresIn": 900
    }
  }
}
```

### POST /auth/login
Login with email/phone and password.

**Request Body:**
```json
{
  "emailOrPhone": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": { ... },
    "tokens": { ... }
  }
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt..."
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "jwt...",
    "expiresIn": 900
  }
}
```

### GET /auth/me
Get current user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "user@example.com",
      "displayName": "John Doe",
      "trustScore": 100,
      "status": "ACTIVE"
    }
  }
}
```

### PUT /auth/password
Update user password.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "oldPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Password updated successfully"
}
```

---

## Vendor Endpoints

### GET /vendors/nearby
Find vendors near coordinates using PostGIS.

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude
- `radiusKm` (optional, default: 5): Search radius in kilometers
- `tags[]` (optional): Filter by tag IDs
- `priceBands[]` (optional): Filter by price bands ($, $$, $$$, $$$$)
- `limit` (optional, default: 20): Results per page
- `offset` (optional, default: 0): Pagination offset

**Example:**
```
GET /vendors/nearby?lat=12.9716&lng=77.5946&radiusKm=5&limit=20
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "vendors": [
      {
        "id": "uuid",
        "name": "Brahmins' Coffee Bar",
        "description": "Iconic Bangalore breakfast spot...",
        "priceBand": "$",
        "isVerified": true,
        "popularityScore": 95.5,
        "latitude": 12.9416,
        "longitude": 77.5612,
        "city": "Bangalore",
        "area": "Basavanagudi",
        "distance_meters": 450,
        "tags": [
          {
            "id": "uuid",
            "name": "South Indian",
            "category": "CUISINE"
          }
        ]
      }
    ],
    "total": 47,
    "limit": 20,
    "offset": 0
  }
}
```

### GET /vendors/:id
Get detailed vendor information.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Brahmins' Coffee Bar",
    "description": "Iconic...",
    "priceBand": "$",
    "isVerified": true,
    "location": {
      "latitude": 12.9416,
      "longitude": 77.5612,
      "city": "Bangalore",
      "area": "Basavanagudi"
    },
    "operationalInfo": {
      "openingHours": {
        "monday": "06:30-11:00, 16:00-20:00"
      },
      "contactPhone": "+91-80-2661-0588"
    },
    "tags": [...],
    "menuItems": [...],
    "reviewStats": {
      "averageScore": 4.7,
      "totalReviews": 234
    },
    "userReview": null
  }
}
```

### GET /vendors/search
Search vendors by name or description.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Example:**
```
GET /vendors/search?q=coffee
```

### GET /vendors/featured
Get featured vendors (highest popularity).

**Query Parameters:**
- `limit` (optional, default: 10)

---

## Review Endpoints

### POST /reviews
Create a new review.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "vendorId": "uuid",
  "visitId": "uuid",
  "headline": "Best dosas in Bangalore!",
  "body": "Crispy, authentic...",
  "overallScore": 5,
  "ratings": [
    { "dimension": "FOOD", "score": 5 },
    { "dimension": "SERVICE", "score": 4 }
  ],
  "mediaIds": ["uuid1", "uuid2"]
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "review": {
      "id": "uuid",
      "vendorId": "uuid",
      "headline": "Best dosas in Bangalore!",
      "overallScore": 5,
      "status": "VISIBLE",
      "createdAt": "2025-12-31T10:00:00Z"
    },
    "walletReward": {
      "amount": 50,
      "reason": "REVIEW_BONUS"
    }
  }
}
```

### PUT /reviews/:id
Update an existing review.

### DELETE /reviews/:id
Delete a review.

### POST /reviews/:id/helpful
Mark a review as helpful.

---

## Wallet Endpoints

### GET /wallet
Get user wallet balance.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "wallet": {
      "id": "uuid",
      "userId": "uuid",
      "balance": 450,
      "currency": "points",
      "updatedAt": "2025-12-31T10:00:00Z"
    }
  }
}
```

### GET /wallet/transactions
Get wallet transaction history.

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "amount": 50,
        "reason": "REVIEW_BONUS",
        "referenceType": "review",
        "referenceId": "uuid",
        "balanceAfter": 450,
        "createdAt": "2025-12-31T10:00:00Z"
      }
    ],
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "status": "error",
  "message": "Error description"
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limits

- General API: 100 requests per 15 minutes per IP
- Auth endpoints: 5 attempts per 15 minutes per IP
- Upload endpoints: 10 requests per minute per user

---

## Pagination

All list endpoints support pagination:
- `limit`: Number of results per page (default: 20)
- `offset`: Number of results to skip (default: 0)

For cursor-based pagination (feed), use:
- `cursor`: Last item ID from previous page

---

## Filtering

Vendor search supports multiple filters:
- Tags: `tags[]=uuid1&tags[]=uuid2`
- Price bands: `priceBands[]=$&priceBands[]=$$`
- Distance: Automatic with `nearby` endpoint

---

## Versioning

API is versioned in the URL path: `/api/v1/...`

Breaking changes will result in new version: `/api/v2/...`

---

## Support

For API questions or issues:
- Check this documentation
- Review error messages
- Contact: dev@raastaa.com
