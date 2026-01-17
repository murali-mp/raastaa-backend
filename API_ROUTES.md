# 📋 Raastaa API Routes

**Base URL:** `https://api.raastaa.app`

---

## 🔐 Auth (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/request-otp` | Request OTP for phone login | ❌ |
| `POST` | `/verify-otp` | Verify OTP and get tokens | ❌ |
| `POST` | `/register/user` | Register new user (email/password) | ❌ |
| `POST` | `/register/vendor` | Register vendor (pending approval) | ❌ |
| `POST` | `/login` | Login with email/phone/username | ❌ |
| `POST` | `/refresh` | Refresh access token | ❌ |
| `POST` | `/logout` | Logout and invalidate token | ✅ |
| `GET` | `/me` | Get current user/vendor profile | ✅ |
| `GET` | `/check/username/:username` | Check username availability | ❌ |
| `GET` | `/check/email` | Check email availability | ❌ |
| `GET` | `/check/phone` | Check phone availability | ❌ |
| `POST` | `/change-password` | Change password | ✅ |

---

## 👤 Users (`/api/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/search` | Search users by query | ✅ |
| `GET` | `/username/:username` | Get user by username | ✅ |
| `GET` | `/:userId` | Get user by ID | ✅ |
| `GET` | `/:userId/posts` | Get user's posts | ✅ |
| `PATCH` | `/me` | Update profile | ✅ |
| `POST` | `/me/avatar` | Upload avatar | ✅ |
| `GET` | `/me/saved` | Get saved posts | ✅ |
| `GET` | `/me/referrals` | Get referral stats | ✅ |
| `GET` | `/me/caps/history` | Get bottle caps history | ✅ |
| `GET` | `/me/achievements` | Get achievements | ✅ |
| `GET` | `/me/blocked` | Get blocked users | ✅ |
| `POST` | `/block` | Block a user | ✅ |
| `DELETE` | `/block/:userId` | Unblock user | ✅ |
| `DELETE` | `/me` | Delete account permanently | ✅ |

---

## 🏪 Vendors (`/api/vendors`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/search` | Search vendors | ✅ |
| `GET` | `/nearby` | Get nearby vendors (geo query) | ✅ |
| `GET` | `/:vendorId` | Get vendor details | ✅ |
| `GET` | `/:vendorId/menu` | Get vendor menu | ✅ |
| `GET` | `/:vendorId/posts` | Get vendor posts | ✅ |
| `GET` | `/:vendorId/ratings` | Get vendor ratings | ✅ |
| `PATCH` | `/me` | Update vendor profile | 🏪 |
| `POST` | `/me/photo` | Upload stall photo | 🏪 |
| `POST` | `/me/banner` | Upload banner image | 🏪 |
| `POST` | `/me/go-live` | Go live with location | 🏪 |
| `POST` | `/me/location` | Update current location | 🏪 |
| `POST` | `/me/go-offline` | Go offline | 🏪 |
| `GET` | `/me/analytics` | Get vendor analytics | 🏪 |
| `POST` | `/me/menu` | Add menu item | 🏪 |
| `PATCH` | `/me/menu/:itemId` | Update menu item | 🏪 |
| `DELETE` | `/me/menu/:itemId` | Delete menu item | 🏪 |

---

## 📝 Posts (`/api/posts`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/feed` | Get personalized feed | ✅ |
| `GET` | `/discover` | Get discover/explore feed | ✅ |
| `GET` | `/saved` | Get saved posts | ✅ |
| `GET` | `/hashtags/trending` | Get trending hashtags | ✅ |
| `GET` | `/hashtags/search` | Search posts by hashtag | ✅ |
| `POST` | `/` | Create new post | ✅ |
| `GET` | `/:postId` | Get post by ID | ✅ |
| `PATCH` | `/:postId` | Update post | ✅ |
| `DELETE` | `/:postId` | Delete post | ✅ |
| `POST` | `/:postId/like` | Like post | ✅ |
| `DELETE` | `/:postId/like` | Unlike post | ✅ |
| `POST` | `/:postId/save` | Save post | ✅ |
| `DELETE` | `/:postId/save` | Unsave post | ✅ |
| `POST` | `/:postId/report` | Report post | ✅ |

---

## 💬 Comments (`/api/comments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/posts/:postId/comments` | Get comments for post | ✅ |
| `GET` | `/:commentId/replies` | Get replies to comment | ✅ |
| `POST` | `/` | Create comment | ✅ |
| `PATCH` | `/:commentId` | Update comment | ✅ |
| `DELETE` | `/:commentId` | Delete comment | ✅ |
| `POST` | `/:commentId/like` | Like comment | ✅ |
| `DELETE` | `/:commentId/like` | Unlike comment | ✅ |

---

## 👥 Social (`/api/social`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/users/follow` | Follow a user | ✅ |
| `DELETE` | `/users/:userId/follow` | Unfollow a user | ✅ |
| `GET` | `/users/:userId/followers` | Get user's followers | ✅ |
| `GET` | `/users/:userId/following` | Get who user follows | ✅ |
| `GET` | `/me/followers` | Get my followers | ✅ |
| `GET` | `/me/following` | Get who I follow | ✅ |
| `POST` | `/vendors/follow` | Follow a vendor | ✅ |
| `DELETE` | `/vendors/:vendorId/follow` | Unfollow a vendor | ✅ |
| `POST` | `/friends/request` | Send friend request | ✅ |
| `POST` | `/friends/respond` | Accept/reject request | ✅ |
| `GET` | `/friends/pending` | Get pending requests | ✅ |
| `GET` | `/friends` | Get friends list | ✅ |
| `DELETE` | `/friends/:friendId` | Remove friend | ✅ |

---

## 🗺️ Expeditions (`/api/expeditions`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/me` | Get my expeditions | ✅ |
| `GET` | `/invites` | Get pending invites | ✅ |
| `GET` | `/discover` | Discover public expeditions | ✅ |
| `POST` | `/` | Create expedition | ✅ |
| `GET` | `/:expeditionId` | Get expedition details | ✅ |
| `PATCH` | `/:expeditionId` | Update expedition | ✅ |
| `POST` | `/:expeditionId/publish` | Publish expedition | ✅ |
| `POST` | `/:expeditionId/start` | Start expedition | ✅ |
| `POST` | `/:expeditionId/complete` | Complete expedition | ✅ |
| `POST` | `/:expeditionId/cancel` | Cancel expedition | ✅ |
| `POST` | `/:expeditionId/check-in` | Check in at vendor | ✅ |
| `POST` | `/:expeditionId/vendors/:vid/skip` | Skip a vendor | ✅ |
| `POST` | `/:expeditionId/invite` | Invite participants | ✅ |
| `POST` | `/:expeditionId/respond` | Respond to invite | ✅ |
| `POST` | `/:expeditionId/join` | Request to join | ✅ |
| `DELETE` | `/:expeditionId/leave` | Leave expedition | ✅ |

---

## ⭐ Ratings (`/api/ratings`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/vendors/:vendorId` | Get vendor ratings | ✅ |
| `GET` | `/vendors/:vendorId/stats` | Get vendor rating stats | ✅ |
| `GET` | `/:id` | Get rating by ID | ✅ |
| `GET` | `/users/:userId` | Get user's ratings | ✅ |
| `GET` | `/me` | Get my ratings | ✅ |
| `POST` | `/` | Create rating | ✅ |
| `PUT` | `/:id` | Update rating | ✅ |
| `DELETE` | `/:id` | Delete rating | ✅ |
| `POST` | `/:id/helpful` | Mark as helpful | ✅ |
| `POST` | `/:id/report` | Report rating | ✅ |

---

## 🧢 Bottle Caps (`/api/bottlecaps`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/leaderboard` | Get leaderboard | ✅ |
| `GET` | `/balance` | Get my balance | ✅ |
| `GET` | `/transactions` | Get transaction history | ✅ |
| `GET` | `/rank` | Get my rank | ✅ |
| `GET` | `/daily/status` | Get daily reward status | ✅ |
| `POST` | `/daily/claim` | Claim daily reward | ✅ |
| `POST` | `/spend` | Spend bottle caps | ✅ |
| `POST` | `/admin/grant` | Grant caps (admin) | 🛡️ |
| `POST` | `/admin/deduct` | Deduct caps (admin) | 🛡️ |

---

## 🔔 Notifications (`/api/notifications`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/` | Get notifications | ✅ |
| `GET` | `/unread-count` | Get unread count | ✅ |
| `GET` | `/preferences` | Get notification preferences | ✅ |
| `POST` | `/mark-read` | Mark notifications as read | ✅ |
| `POST` | `/mark-all-read` | Mark all as read | ✅ |
| `DELETE` | `/` | Delete notifications | ✅ |

---

## 📤 Uploads (`/api/uploads`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/presigned-url` | Get presigned URL for upload | ✅ |
| `POST` | `/batch-presigned-urls` | Get batch presigned URLs | ✅ |
| `DELETE` | `/` | Delete file from storage | ✅ |

---

## 🛡️ Admin (`/api/admin`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/dashboard` | Get dashboard stats | 🛡️ |
| `GET` | `/vendors/pending` | Get pending vendor approvals | 🛡️ |
| `POST` | `/vendors/:vendorId/approve` | Approve/reject vendor | 🛡️ |
| `GET` | `/flags` | Get content flags | 🛡️ |
| `POST` | `/flags/:flagId/resolve` | Resolve content flag | 🛡️ |
| `GET` | `/users` | Get all users | 🛡️ |
| `POST` | `/users/:userId/action` | User action (ban/warn) | 🛡️ |
| `POST` | `/broadcast` | Send broadcast notification | 🛡️ |

---

## 💚 Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/health` | Health check (uptime, db, redis) | ❌ |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ❌ | No authentication required |
| ✅ | User authentication required |
| 🏪 | Vendor authentication required |
| 🛡️ | Admin authentication required |

---

## Quick Start

```bash
# Check API health
curl https://api.raastaa.app/health

# Request OTP
curl -X POST https://api.raastaa.app/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Verify OTP (dev mode: any 6 digits work)
curl -X POST https://api.raastaa.app/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456"}'

# Get profile (with token)
curl https://api.raastaa.app/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Total Routes:** ~100+ endpoints across 12 modules

**TUI Tool:** Run `npm run tui -- --routes` to see this in terminal
