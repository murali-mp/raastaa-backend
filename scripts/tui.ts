#!/usr/bin/env ts-node
/**
 * Raastaa Backend TUI - Interactive API Testing Tool
 * Run with: npm run tui
 * Show routes: npm run tui -- --routes
 */

import * as readline from 'readline';
import * as https from 'https';
import * as http from 'http';

// ============================================
// EARLY CLI FLAGS (before readline is created)
// ============================================
const args = process.argv.slice(2);

// Colors needed for early output
const earlyColors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

if (args.includes('--routes') || args.includes('-r')) {
  console.log(`
${earlyColors.bright}${earlyColors.cyan}📋 RAASTAA API ROUTES SUMMARY${earlyColors.reset}
${earlyColors.dim}${'═'.repeat(60)}${earlyColors.reset}

${earlyColors.bright}${earlyColors.magenta}🔐 AUTH (/api/auth)${earlyColors.reset}
  POST /request-otp         Request OTP for phone login
  POST /verify-otp          Verify OTP & get tokens
  POST /register/user       Register new user (email/password)
  POST /register/vendor     Register vendor (pending approval)
  POST /login               Login with email/phone/username
  POST /refresh             Refresh access token
  POST /logout              Logout
  GET  /me                  Get current user/vendor
  GET  /check/username/:u   Check if username available
  GET  /check/email         Check if email available
  GET  /check/phone         Check if phone available
  POST /change-password     Change password

${earlyColors.bright}${earlyColors.magenta}👤 USERS (/api/users)${earlyColors.reset}
  GET  /search              Search users
  GET  /username/:username  Get user by username
  GET  /:userId             Get user by ID
  GET  /:userId/posts       Get user's posts
  PATCH /me                 Update profile
  POST /me/avatar           Upload avatar
  GET  /me/saved            Get saved posts
  GET  /me/referrals        Get referral stats
  GET  /me/caps/history     Get bottle caps history
  GET  /me/achievements     Get achievements
  GET  /me/blocked          Get blocked users
  POST /block               Block a user
  DELETE /block/:userId     Unblock user
  DELETE /me                Delete account

${earlyColors.bright}${earlyColors.magenta}🏪 VENDORS (/api/vendors)${earlyColors.reset}
  GET  /search              Search vendors
  GET  /nearby              Get nearby vendors (geo)
  GET  /:vendorId           Get vendor details
  GET  /:vendorId/menu      Get vendor menu
  GET  /:vendorId/posts     Get vendor posts
  GET  /:vendorId/ratings   Get vendor ratings
  PATCH /me                 Update vendor profile [Vendor]
  POST /me/photo            Upload stall photo [Vendor]
  POST /me/go-live          Go live with location [Vendor]
  POST /me/location         Update location [Vendor]
  POST /me/go-offline       Go offline [Vendor]
  GET  /me/analytics        Get analytics [Vendor]
  POST /me/menu             Add menu item [Vendor]
  PATCH /me/menu/:itemId    Update menu item [Vendor]
  DELETE /me/menu/:itemId   Delete menu item [Vendor]

${earlyColors.bright}${earlyColors.magenta}📝 POSTS (/api/posts)${earlyColors.reset}
  GET  /feed                Get personalized feed
  GET  /discover            Get discover feed
  GET  /saved               Get saved posts
  GET  /hashtags/trending   Get trending hashtags
  GET  /hashtags/search     Search by hashtag
  POST /                    Create post
  GET  /:postId             Get post
  PATCH /:postId            Update post
  DELETE /:postId           Delete post
  POST /:postId/like        Like post
  DELETE /:postId/like      Unlike post
  POST /:postId/save        Save post
  DELETE /:postId/save      Unsave post
  POST /:postId/report      Report post

${earlyColors.bright}${earlyColors.magenta}💬 COMMENTS (/api/comments)${earlyColors.reset}
  GET  /posts/:postId/comments  Get comments for post
  GET  /:commentId/replies      Get replies
  POST /                        Create comment
  PATCH /:commentId             Update comment
  DELETE /:commentId            Delete comment
  POST /:commentId/like         Like comment
  DELETE /:commentId/like       Unlike comment

${earlyColors.bright}${earlyColors.magenta}👥 SOCIAL (/api/social)${earlyColors.reset}
  POST /users/follow            Follow user
  DELETE /users/:userId/follow  Unfollow user
  GET  /users/:userId/followers Get followers
  GET  /users/:userId/following Get following
  GET  /me/followers            Get my followers
  GET  /me/following            Get my following
  POST /vendors/follow          Follow vendor
  DELETE /vendors/:vid/follow   Unfollow vendor
  POST /friends/request         Send friend request
  POST /friends/respond         Respond to request
  GET  /friends/pending         Get pending requests
  GET  /friends                 Get friends list
  DELETE /friends/:friendId     Remove friend

${earlyColors.bright}${earlyColors.magenta}🗺️ EXPEDITIONS (/api/expeditions)${earlyColors.reset}
  GET  /me                      Get my expeditions
  GET  /invites                 Get pending invites
  GET  /discover                Discover public expeditions
  POST /                        Create expedition
  GET  /:expeditionId           Get expedition details
  PATCH /:expeditionId          Update expedition
  POST /:expeditionId/publish   Publish expedition
  POST /:expeditionId/start     Start expedition
  POST /:expeditionId/complete  Complete expedition
  POST /:expeditionId/cancel    Cancel expedition
  POST /:expeditionId/check-in  Check in at vendor
  POST /:expeditionId/invite    Invite participants
  POST /:expeditionId/join      Request to join
  DELETE /:expeditionId/leave   Leave expedition

${earlyColors.bright}${earlyColors.magenta}⭐ RATINGS (/api/ratings)${earlyColors.reset}
  GET  /vendors/:vendorId       Get vendor ratings
  GET  /vendors/:vendorId/stats Get vendor rating stats
  GET  /:id                     Get rating
  GET  /users/:userId           Get user's ratings
  GET  /me                      Get my ratings
  POST /                        Create rating
  PUT  /:id                     Update rating
  DELETE /:id                   Delete rating
  POST /:id/helpful             Mark as helpful
  POST /:id/report              Report rating

${earlyColors.bright}${earlyColors.magenta}🧢 BOTTLE CAPS (/api/bottlecaps)${earlyColors.reset}
  GET  /leaderboard             Get leaderboard
  GET  /balance                 Get my balance
  GET  /transactions            Get transactions
  GET  /rank                    Get my rank
  GET  /daily/status            Get daily reward status
  POST /daily/claim             Claim daily reward
  POST /spend                   Spend bottle caps
  POST /admin/grant             Grant caps [Admin]
  POST /admin/deduct            Deduct caps [Admin]

${earlyColors.bright}${earlyColors.magenta}🔔 NOTIFICATIONS (/api/notifications)${earlyColors.reset}
  GET  /                        Get notifications
  GET  /unread-count            Get unread count
  GET  /preferences             Get preferences
  POST /mark-read               Mark as read
  POST /mark-all-read           Mark all read
  DELETE /                      Delete notifications

${earlyColors.bright}${earlyColors.magenta}📤 UPLOADS (/api/uploads)${earlyColors.reset}
  POST /presigned-url           Get presigned URL
  POST /batch-presigned-urls    Get batch URLs
  DELETE /                      Delete file

${earlyColors.bright}${earlyColors.magenta}🛡️ ADMIN (/api/admin)${earlyColors.reset}
  GET  /dashboard               Get dashboard stats
  GET  /vendors/pending         Get pending vendors
  POST /vendors/:vid/approve    Approve vendor
  GET  /flags                   Get content flags
  POST /flags/:flagId/resolve   Resolve flag
  GET  /users                   Get all users
  POST /users/:userId/action    User action (ban/warn)
  POST /broadcast               Send broadcast

${earlyColors.bright}${earlyColors.magenta}💚 HEALTH${earlyColors.reset}
  GET  /health                  Health check (uptime, db, redis)

${earlyColors.dim}${'═'.repeat(60)}${earlyColors.reset}
${earlyColors.cyan}Total: ~100+ endpoints across 12 modules${earlyColors.reset}
`);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${earlyColors.bright}Raastaa Backend TUI${earlyColors.reset}

Usage: npm run tui [options]

Options:
  --routes, -r    Show all API routes summary
  --help, -h      Show this help message

Environment:
  API_URL         Set API base URL (default: https://api.raastaa.app)

Examples:
  npm run tui                    # Start interactive TUI
  npm run tui -- --routes        # Show all API routes
  API_URL=http://localhost:3000 npm run tui
`);
  process.exit(0);
}

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  baseUrl: process.env.API_URL || 'https://api.raastaa.app',
  token: '',
  refreshToken: '',
  userId: '',
  vendorId: '',
  phone: '',
};

// ============================================
// COLORS & FORMATTING
// ============================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

const c = {
  title: (s: string) => `${colors.bgBlue}${colors.white}${colors.bright} ${s} ${colors.reset}`,
  success: (s: string) => `${colors.green}✓ ${s}${colors.reset}`,
  error: (s: string) => `${colors.red}✗ ${s}${colors.reset}`,
  info: (s: string) => `${colors.cyan}ℹ ${s}${colors.reset}`,
  warn: (s: string) => `${colors.yellow}⚠ ${s}${colors.reset}`,
  dim: (s: string) => `${colors.dim}${s}${colors.reset}`,
  highlight: (s: string) => `${colors.bright}${colors.cyan}${s}${colors.reset}`,
  menu: (n: string, s: string) => `  ${colors.yellow}[${n}]${colors.reset} ${s}`,
  header: (s: string) => `\n${colors.bright}${colors.magenta}═══ ${s} ═══${colors.reset}\n`,
};

// ============================================
// HTTP CLIENT
// ============================================
async function request(
  method: string,
  path: string,
  body?: any,
  customHeaders?: Record<string, string>
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (CONFIG.token) {
      headers['Authorization'] = `Bearer ${CONFIG.token}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode || 0, data: parsed });
        } catch {
          resolve({ status: res.statusCode || 0, data: { raw: data } });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ============================================
// READLINE INTERFACE
// ============================================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

function printJson(obj: any) {
  console.log(JSON.stringify(obj, null, 2));
}

function printResponse(res: { status: number; data: any }) {
  const statusColor = res.status >= 200 && res.status < 300 ? colors.green : colors.red;
  console.log(`\n${statusColor}Status: ${res.status}${colors.reset}`);
  console.log(c.dim('─'.repeat(50)));
  printJson(res.data);
  console.log(c.dim('─'.repeat(50)));
}

// ============================================
// AUTH MENU
// ============================================

// Quick login function for main menu
async function quickLogin() {
  console.log(c.header('🔑 QUICK LOGIN'));
  const phone = await prompt('Phone (e.g., +919876543210): ');
  
  console.log(c.info('Requesting OTP...'));
  const otpRes = await request('POST', '/api/auth/request-otp', { phone });
  
  if (otpRes.status !== 200) {
    console.log(c.error('Failed to request OTP'));
    printResponse(otpRes);
    return;
  }
  
  console.log(c.success('OTP sent! (Dev mode: use any 6 digits like 123456)'));
  const otp = await prompt('Enter OTP: ');
  
  console.log(c.info('Verifying...'));
  const verifyRes = await request('POST', '/api/auth/verify-otp', { phone, otp });
  
  if (verifyRes.status === 200 && verifyRes.data?.data?.tokens) {
    CONFIG.token = verifyRes.data.data.tokens.accessToken;
    CONFIG.refreshToken = verifyRes.data.data.tokens.refreshToken;
    CONFIG.userId = verifyRes.data.data.user?.uuid || '';
    CONFIG.phone = phone;
    console.log(c.success(`Logged in as: ${verifyRes.data.data.user?.username || phone}`));
    console.log(c.info(`User ID: ${CONFIG.userId}`));
    console.log(c.info(`New User: ${verifyRes.data.data.isNewUser ? 'Yes' : 'No'}`));
  } else {
    console.log(c.error('Login failed'));
    printResponse(verifyRes);
  }
}

async function authMenu() {
  console.log(c.header('AUTHENTICATION'));
  console.log(c.menu('1', 'Quick Login (OTP - Recommended)'));
  console.log(c.menu('2', 'Register User (Email/Password)'));
  console.log(c.menu('3', 'Login (Email/Password)'));
  console.log(c.menu('4', 'Refresh Token'));
  console.log(c.menu('5', 'Logout'));
  console.log(c.menu('6', 'View Current Token'));
  console.log(c.menu('7', 'Check Username Availability'));
  console.log(c.menu('8', 'Check Email Availability'));
  console.log(c.menu('9', 'Check Phone Availability'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      await quickLogin();
      break;
    }
    case '2': {
      console.log(c.header('REGISTER USER'));
      const email = await prompt('Email: ');
      const phone = await prompt('Phone (+91...): ');
      const username = await prompt('Username: ');
      const password = await prompt('Password: ');
      const display_name = await prompt('Display Name: ');
      const dob = await prompt('Date of Birth (YYYY-MM-DD): ');
      
      const res = await request('POST', '/api/auth/register/user', {
        email,
        phone,
        username,
        password,
        display_name,
        dob: new Date(dob).toISOString(),
      });
      printResponse(res);
      if (res.data?.data?.tokens) {
        CONFIG.token = res.data.data.tokens.accessToken;
        CONFIG.refreshToken = res.data.data.tokens.refreshToken;
        CONFIG.userId = res.data.data.user?.uuid || '';
        console.log(c.success('Registered and logged in!'));
      }
      break;
    }
    case '3': {
      const identifier = await prompt('Email/Phone/Username: ');
      const password = await prompt('Password: ');
      console.log(c.info('Logging in...'));
      const res = await request('POST', '/api/auth/login', { identifier, password });
      printResponse(res);
      if (res.data?.data?.tokens) {
        CONFIG.token = res.data.data.tokens.accessToken;
        CONFIG.refreshToken = res.data.data.tokens.refreshToken;
        CONFIG.userId = res.data.data.user?.uuid || '';
        console.log(c.success('Logged in!'));
      }
      break;
    }
    case '4': {
      if (!CONFIG.refreshToken) {
        console.log(c.error('No refresh token available'));
        break;
      }
      console.log(c.info('Refreshing token...'));
      const res = await request('POST', '/api/auth/refresh', { refresh_token: CONFIG.refreshToken });
      printResponse(res);
      if (res.data?.data?.accessToken) {
        CONFIG.token = res.data.data.accessToken;
        console.log(c.success('Token refreshed!'));
      }
      break;
    }
    case '5': {
      console.log(c.info('Logging out...'));
      const res = await request('POST', '/api/auth/logout');
      printResponse(res);
      CONFIG.token = '';
      CONFIG.refreshToken = '';
      CONFIG.userId = '';
      CONFIG.phone = '';
      console.log(c.success('Logged out, tokens cleared'));
      break;
    }
    case '6': {
      console.log(c.header('CURRENT SESSION'));
      console.log(`Token: ${CONFIG.token ? c.highlight(CONFIG.token.substring(0, 30) + '...') : c.dim('(none)')}`);
      console.log(`User ID: ${CONFIG.userId || c.dim('(none)')}`);
      console.log(`Phone: ${CONFIG.phone || c.dim('(none)')}`);
      console.log(`Vendor ID: ${CONFIG.vendorId || c.dim('(none)')}`);
      break;
    }
    case '7': {
      const username = await prompt('Username to check: ');
      const res = await request('GET', `/api/auth/check/username/${username}`);
      printResponse(res);
      break;
    }
    case '8': {
      const email = await prompt('Email to check: ');
      const res = await request('GET', `/api/auth/check/email?email=${encodeURIComponent(email)}`);
      printResponse(res);
      break;
    }
    case '9': {
      const phone = await prompt('Phone to check: ');
      const res = await request('GET', `/api/auth/check/phone?phone=${encodeURIComponent(phone)}`);
      printResponse(res);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await authMenu();
}

// ============================================
// USERS MENU
// ============================================
async function usersMenu() {
  console.log(c.header('USERS'));
  console.log(c.menu('1', 'Get My Profile'));
  console.log(c.menu('2', 'Update My Profile'));
  console.log(c.menu('3', 'Get User by ID'));
  console.log(c.menu('4', 'Search Users'));
  console.log(c.menu('5', 'Get My Posts'));
  console.log(c.menu('6', 'Get My Saved Posts'));
  console.log(c.menu('7', 'Get My Activity History'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      console.log(c.info('Fetching profile...'));
      const res = await request('GET', '/api/users/me');
      printResponse(res);
      break;
    }
    case '2': {
      console.log(c.info('Update profile - leave blank to skip field'));
      const display_name = await prompt('Display name: ');
      const bio = await prompt('Bio: ');
      const body: any = {};
      if (display_name) body.display_name = display_name;
      if (bio) body.bio = bio;
      console.log(c.info('Updating profile...'));
      const res = await request('PATCH', '/api/users/me', body);
      printResponse(res);
      break;
    }
    case '3': {
      const userId = await prompt('User ID: ');
      console.log(c.info('Fetching user...'));
      const res = await request('GET', `/api/users/${userId}`);
      printResponse(res);
      break;
    }
    case '4': {
      const q = await prompt('Search query: ');
      console.log(c.info('Searching users...'));
      const res = await request('GET', `/api/users/search?q=${encodeURIComponent(q)}`);
      printResponse(res);
      break;
    }
    case '5': {
      console.log(c.info('Fetching your posts...'));
      const res = await request('GET', `/api/users/${CONFIG.userId}/posts`);
      printResponse(res);
      break;
    }
    case '6': {
      console.log(c.info('Fetching saved posts...'));
      const res = await request('GET', '/api/users/me/saved');
      printResponse(res);
      break;
    }
    case '7': {
      console.log(c.info('Fetching activity history...'));
      const res = await request('GET', '/api/users/me/activity');
      printResponse(res);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await usersMenu();
}

// ============================================
// VENDORS MENU
// ============================================
async function vendorsMenu() {
  console.log(c.header('VENDORS'));
  console.log(c.menu('1', 'Search Vendors'));
  console.log(c.menu('2', 'Get Nearby Vendors'));
  console.log(c.menu('3', 'Get Vendor by ID'));
  console.log(c.menu('4', 'Get Vendor Menu'));
  console.log(c.menu('5', 'Get Vendor Ratings'));
  console.log(c.menu('6', 'Follow Vendor'));
  console.log(c.menu('7', '[Vendor] Go Live'));
  console.log(c.menu('8', '[Vendor] Go Offline'));
  console.log(c.menu('9', '[Vendor] Update Location'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      const q = await prompt('Search query (blank for all): ');
      const category = await prompt('Category (blank for any): ');
      let url = '/api/vendors/search?';
      if (q) url += `q=${encodeURIComponent(q)}&`;
      if (category) url += `category=${encodeURIComponent(category)}&`;
      console.log(c.info('Searching vendors...'));
      const res = await request('GET', url);
      printResponse(res);
      break;
    }
    case '2': {
      const lat = await prompt('Latitude (e.g., 12.9716): ');
      const lng = await prompt('Longitude (e.g., 77.5946): ');
      const radius = await prompt('Radius in meters (default 1000): ');
      let url = `/api/vendors/nearby?lat=${lat}&lng=${lng}`;
      if (radius) url += `&radius=${radius}`;
      console.log(c.info('Fetching nearby vendors...'));
      const res = await request('GET', url);
      printResponse(res);
      break;
    }
    case '3': {
      const vendorId = await prompt('Vendor ID: ');
      console.log(c.info('Fetching vendor...'));
      const res = await request('GET', `/api/vendors/${vendorId}`);
      printResponse(res);
      break;
    }
    case '4': {
      const vendorId = await prompt('Vendor ID: ');
      console.log(c.info('Fetching menu...'));
      const res = await request('GET', `/api/vendors/${vendorId}/menu`);
      printResponse(res);
      break;
    }
    case '5': {
      const vendorId = await prompt('Vendor ID: ');
      console.log(c.info('Fetching ratings...'));
      const res = await request('GET', `/api/vendors/${vendorId}/ratings`);
      printResponse(res);
      break;
    }
    case '6': {
      const vendorId = await prompt('Vendor ID to follow: ');
      console.log(c.info('Following vendor...'));
      const res = await request('POST', `/api/social/vendors/${vendorId}/follow`);
      printResponse(res);
      break;
    }
    case '7': {
      const lat = await prompt('Your latitude: ');
      const lng = await prompt('Your longitude: ');
      console.log(c.info('Going live...'));
      const res = await request('POST', '/api/vendors/me/go-live', {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });
      printResponse(res);
      break;
    }
    case '8': {
      console.log(c.info('Going offline...'));
      const res = await request('POST', '/api/vendors/me/go-offline');
      printResponse(res);
      break;
    }
    case '9': {
      const lat = await prompt('New latitude: ');
      const lng = await prompt('New longitude: ');
      console.log(c.info('Updating location...'));
      const res = await request('POST', '/api/vendors/me/location', {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });
      printResponse(res);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await vendorsMenu();
}

// ============================================
// POSTS MENU
// ============================================
async function postsMenu() {
  console.log(c.header('POSTS'));
  console.log(c.menu('1', 'Get Feed'));
  console.log(c.menu('2', 'Create Post'));
  console.log(c.menu('3', 'Get Post by ID'));
  console.log(c.menu('4', 'Like Post'));
  console.log(c.menu('5', 'Unlike Post'));
  console.log(c.menu('6', 'Save Post'));
  console.log(c.menu('7', 'Unsave Post'));
  console.log(c.menu('8', 'Delete Post'));
  console.log(c.menu('9', 'Get Trending Hashtags'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      const cursor = await prompt('Cursor (blank for first page): ');
      let url = '/api/posts/feed';
      if (cursor) url += `?cursor=${cursor}`;
      console.log(c.info('Fetching feed...'));
      const res = await request('GET', url);
      printResponse(res);
      break;
    }
    case '2': {
      const content = await prompt('Post content: ');
      const vendorId = await prompt('Vendor ID (if tagging a vendor, blank otherwise): ');
      const hashtags = await prompt('Hashtags (comma-separated, e.g., streetfood,bangalore): ');
      const body: any = { content };
      if (vendorId) body.vendor_id = vendorId;
      if (hashtags) body.hashtags = hashtags.split(',').map((t) => t.trim());
      console.log(c.info('Creating post...'));
      const res = await request('POST', '/api/posts', body);
      printResponse(res);
      break;
    }
    case '3': {
      const postId = await prompt('Post ID: ');
      console.log(c.info('Fetching post...'));
      const res = await request('GET', `/api/posts/${postId}`);
      printResponse(res);
      break;
    }
    case '4': {
      const postId = await prompt('Post ID to like: ');
      console.log(c.info('Liking post...'));
      const res = await request('POST', `/api/posts/${postId}/like`);
      printResponse(res);
      break;
    }
    case '5': {
      const postId = await prompt('Post ID to unlike: ');
      console.log(c.info('Unliking post...'));
      const res = await request('DELETE', `/api/posts/${postId}/like`);
      printResponse(res);
      break;
    }
    case '6': {
      const postId = await prompt('Post ID to save: ');
      console.log(c.info('Saving post...'));
      const res = await request('POST', `/api/posts/${postId}/save`);
      printResponse(res);
      break;
    }
    case '7': {
      const postId = await prompt('Post ID to unsave: ');
      console.log(c.info('Unsaving post...'));
      const res = await request('DELETE', `/api/posts/${postId}/save`);
      printResponse(res);
      break;
    }
    case '8': {
      const postId = await prompt('Post ID to delete: ');
      console.log(c.info('Deleting post...'));
      const res = await request('DELETE', `/api/posts/${postId}`);
      printResponse(res);
      break;
    }
    case '9': {
      console.log(c.info('Fetching trending hashtags...'));
      const res = await request('GET', '/api/posts/trending/hashtags');
      printResponse(res);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await postsMenu();
}

// ============================================
// SOCIAL MENU
// ============================================
async function socialMenu() {
  console.log(c.header('SOCIAL'));
  console.log(c.menu('1', 'Send Friend Request'));
  console.log(c.menu('2', 'Respond to Friend Request'));
  console.log(c.menu('3', 'Get Pending Requests'));
  console.log(c.menu('4', 'Get Friends List'));
  console.log(c.menu('5', 'Follow User'));
  console.log(c.menu('6', 'Unfollow User'));
  console.log(c.menu('7', 'Get Followers'));
  console.log(c.menu('8', 'Get Following'));
  console.log(c.menu('9', 'Block User'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      const userId = await prompt('User ID to send request to: ');
      console.log(c.info('Sending friend request...'));
      const res = await request('POST', '/api/social/friends/request', { target_user_id: userId });
      printResponse(res);
      break;
    }
    case '2': {
      const requestId = await prompt('Friend Request ID: ');
      const accept = await prompt('Accept? (yes/no): ');
      console.log(c.info('Responding to request...'));
      const res = await request('POST', '/api/social/friends/respond', {
        friendship_id: requestId,
        accept: accept.toLowerCase() === 'yes',
      });
      printResponse(res);
      break;
    }
    case '3': {
      console.log(c.info('Fetching pending requests...'));
      const res = await request('GET', '/api/social/friends/pending');
      printResponse(res);
      break;
    }
    case '4': {
      console.log(c.info('Fetching friends list...'));
      const res = await request('GET', '/api/social/friends');
      printResponse(res);
      break;
    }
    case '5': {
      const userId = await prompt('User ID to follow: ');
      console.log(c.info('Following user...'));
      const res = await request('POST', `/api/social/follow/${userId}`);
      printResponse(res);
      break;
    }
    case '6': {
      const userId = await prompt('User ID to unfollow: ');
      console.log(c.info('Unfollowing user...'));
      const res = await request('DELETE', `/api/social/follow/${userId}`);
      printResponse(res);
      break;
    }
    case '7': {
      const userId = await prompt('User ID (blank for self): ');
      const url = userId ? `/api/users/${userId}/followers` : '/api/social/followers';
      console.log(c.info('Fetching followers...'));
      const res = await request('GET', url);
      printResponse(res);
      break;
    }
    case '8': {
      const userId = await prompt('User ID (blank for self): ');
      const url = userId ? `/api/users/${userId}/following` : '/api/social/following';
      console.log(c.info('Fetching following...'));
      const res = await request('GET', url);
      printResponse(res);
      break;
    }
    case '9': {
      const userId = await prompt('User ID to block: ');
      console.log(c.info('Blocking user...'));
      const res = await request('POST', `/api/social/block/${userId}`);
      printResponse(res);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await socialMenu();
}

// ============================================
// EXPEDITIONS MENU
// ============================================
async function expeditionsMenu() {
  console.log(c.header('EXPEDITIONS'));
  console.log(c.menu('1', 'List Active Expeditions'));
  console.log(c.menu('2', 'Get Expedition Details'));
  console.log(c.menu('3', 'Join Expedition'));
  console.log(c.menu('4', 'Leave Expedition'));
  console.log(c.menu('5', 'Check-in at Checkpoint'));
  console.log(c.menu('6', 'Get My Expeditions'));
  console.log(c.menu('7', 'Get Expedition Leaderboard'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      console.log(c.info('Fetching active expeditions...'));
      const res = await request('GET', '/api/expeditions?status=ACTIVE');
      printResponse(res);
      break;
    }
    case '2': {
      const expId = await prompt('Expedition ID: ');
      console.log(c.info('Fetching expedition details...'));
      const res = await request('GET', `/api/expeditions/${expId}`);
      printResponse(res);
      break;
    }
    case '3': {
      const expId = await prompt('Expedition ID to join: ');
      console.log(c.info('Joining expedition...'));
      const res = await request('POST', `/api/expeditions/${expId}/join`);
      printResponse(res);
      break;
    }
    case '4': {
      const expId = await prompt('Expedition ID to leave: ');
      console.log(c.info('Leaving expedition...'));
      const res = await request('DELETE', `/api/expeditions/${expId}/leave`);
      printResponse(res);
      break;
    }
    case '5': {
      const expId = await prompt('Expedition ID: ');
      const checkpointId = await prompt('Checkpoint ID: ');
      const lat = await prompt('Your latitude: ');
      const lng = await prompt('Your longitude: ');
      console.log(c.info('Checking in...'));
      const res = await request('POST', `/api/expeditions/${expId}/checkpoints/${checkpointId}/check-in`, {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });
      printResponse(res);
      break;
    }
    case '6': {
      console.log(c.info('Fetching your expeditions...'));
      const res = await request('GET', '/api/expeditions/me');
      printResponse(res);
      break;
    }
    case '7': {
      const expId = await prompt('Expedition ID: ');
      console.log(c.info('Fetching leaderboard...'));
      const res = await request('GET', `/api/expeditions/${expId}/leaderboard`);
      printResponse(res);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await expeditionsMenu();
}

// ============================================
// RATINGS MENU
// ============================================
async function ratingsMenu() {
  console.log(c.header('RATINGS'));
  console.log(c.menu('1', 'Create Rating'));
  console.log(c.menu('2', 'Get My Ratings'));
  console.log(c.menu('3', 'Get Vendor Ratings'));
  console.log(c.menu('4', 'Delete Rating'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      const vendorId = await prompt('Vendor ID: ');
      console.log('Rate 1-5 for each (blank to skip):');
      const recommendation = await prompt('Overall recommendation (1-5): ');
      const taste = await prompt('Taste (1-5): ');
      const hygiene = await prompt('Hygiene (1-5): ');
      const value = await prompt('Value for money (1-5): ');
      const review = await prompt('Review text: ');

      const body: any = {
        vendor_id: vendorId,
        recommendation: parseFloat(recommendation) || 3,
      };
      if (taste) body.taste = parseFloat(taste);
      if (hygiene) body.hygiene = parseFloat(hygiene);
      if (value) body.value_for_money = parseFloat(value);
      if (review) body.review = review;

      console.log(c.info('Creating rating...'));
      const res = await request('POST', '/api/ratings', body);
      printResponse(res);
      break;
    }
    case '2': {
      console.log(c.info('Fetching your ratings...'));
      const res = await request('GET', '/api/ratings/me');
      printResponse(res);
      break;
    }
    case '3': {
      const vendorId = await prompt('Vendor ID: ');
      console.log(c.info('Fetching vendor ratings...'));
      const res = await request('GET', `/api/vendors/${vendorId}/ratings`);
      printResponse(res);
      break;
    }
    case '4': {
      const ratingId = await prompt('Rating ID to delete: ');
      console.log(c.info('Deleting rating...'));
      const res = await request('DELETE', `/api/ratings/${ratingId}`);
      printResponse(res);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await ratingsMenu();
}

// ============================================
// BOTTLECAPS MENU
// ============================================
async function bottlecapsMenu() {
  console.log(c.header('BOTTLECAPS 🍾'));
  console.log(c.menu('1', 'Get My Balance'));
  console.log(c.menu('2', 'Get Transaction History'));
  console.log(c.menu('3', 'Gift BottleCaps'));
  console.log(c.menu('4', 'Get Leaderboard'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      console.log(c.info('Fetching balance...'));
      const res = await request('GET', '/api/bottlecaps/balance');
      printResponse(res);
      break;
    }
    case '2': {
      console.log(c.info('Fetching transaction history...'));
      const res = await request('GET', '/api/bottlecaps/history');
      printResponse(res);
      break;
    }
    case '3': {
      const userId = await prompt('Recipient User ID: ');
      const amount = await prompt('Amount to gift: ');
      const message = await prompt('Message (optional): ');
      const body: any = {
        recipient_id: userId,
        amount: parseInt(amount),
      };
      if (message) body.message = message;
      console.log(c.info('Sending gift...'));
      const res = await request('POST', '/api/bottlecaps/gift', body);
      printResponse(res);
      break;
    }
    case '4': {
      console.log(c.info('Fetching leaderboard...'));
      const res = await request('GET', '/api/bottlecaps/leaderboard');
      printResponse(res);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await bottlecapsMenu();
}

// ============================================
// NOTIFICATIONS MENU
// ============================================
async function notificationsMenu() {
  console.log(c.header('NOTIFICATIONS'));
  console.log(c.menu('1', 'Get Notifications'));
  console.log(c.menu('2', 'Mark as Read'));
  console.log(c.menu('3', 'Mark All as Read'));
  console.log(c.menu('4', 'Get Unread Count'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      console.log(c.info('Fetching notifications...'));
      const res = await request('GET', '/api/notifications');
      printResponse(res);
      break;
    }
    case '2': {
      const notifId = await prompt('Notification ID: ');
      console.log(c.info('Marking as read...'));
      const res = await request('PATCH', `/api/notifications/${notifId}/read`);
      printResponse(res);
      break;
    }
    case '3': {
      console.log(c.info('Marking all as read...'));
      const res = await request('PATCH', '/api/notifications/read-all');
      printResponse(res);
      break;
    }
    case '4': {
      console.log(c.info('Fetching unread count...'));
      const res = await request('GET', '/api/notifications/unread-count');
      printResponse(res);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await notificationsMenu();
}

// ============================================
// ADMIN MENU
// ============================================
async function adminMenu() {
  console.log(c.header('ADMIN'));
  console.log(c.menu('1', 'Get Pending Vendors'));
  console.log(c.menu('2', 'Verify Vendor'));
  console.log(c.menu('3', 'Reject Vendor'));
  console.log(c.menu('4', 'Get Content Flags'));
  console.log(c.menu('5', 'Resolve Content Flag'));
  console.log(c.menu('6', 'Get All Users'));
  console.log(c.menu('7', 'Ban User'));
  console.log(c.menu('8', 'Unban User'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      console.log(c.info('Fetching pending vendors...'));
      const res = await request('GET', '/api/admin/vendors/pending');
      printResponse(res);
      break;
    }
    case '2': {
      const vendorId = await prompt('Vendor ID to verify: ');
      console.log(c.info('Verifying vendor...'));
      const res = await request('POST', `/api/admin/vendors/${vendorId}/verify`);
      printResponse(res);
      break;
    }
    case '3': {
      const vendorId = await prompt('Vendor ID to reject: ');
      const reason = await prompt('Rejection reason: ');
      console.log(c.info('Rejecting vendor...'));
      const res = await request('POST', `/api/admin/vendors/${vendorId}/reject`, { reason });
      printResponse(res);
      break;
    }
    case '4': {
      const status = await prompt('Status filter (PENDING/RESOLVED/blank for all): ');
      let url = '/api/admin/flags';
      if (status) url += `?status=${status}`;
      console.log(c.info('Fetching content flags...'));
      const res = await request('GET', url);
      printResponse(res);
      break;
    }
    case '5': {
      const flagId = await prompt('Flag ID: ');
      const action = await prompt('Action (APPROVED/REMOVED/DISMISSED): ');
      console.log(c.info('Resolving flag...'));
      const res = await request('POST', `/api/admin/flags/${flagId}/resolve`, {
        action,
      });
      printResponse(res);
      break;
    }
    case '6': {
      const search = await prompt('Search query (blank for all): ');
      let url = '/api/admin/users';
      if (search) url += `?search=${encodeURIComponent(search)}`;
      console.log(c.info('Fetching users...'));
      const res = await request('GET', url);
      printResponse(res);
      break;
    }
    case '7': {
      const userId = await prompt('User ID to ban: ');
      const reason = await prompt('Ban reason: ');
      console.log(c.info('Banning user...'));
      const res = await request('POST', `/api/admin/users/${userId}/ban`, { reason });
      printResponse(res);
      break;
    }
    case '8': {
      const userId = await prompt('User ID to unban: ');
      console.log(c.info('Unbanning user...'));
      const res = await request('POST', `/api/admin/users/${userId}/unban`);
      printResponse(res);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await adminMenu();
}

// ============================================
// RAW REQUEST
// ============================================
async function rawRequestMenu() {
  console.log(c.header('RAW HTTP REQUEST'));

  const method = await prompt('Method (GET/POST/PATCH/DELETE): ');
  const path = await prompt('Path (e.g., /api/users/me): ');
  const bodyStr = await prompt('JSON Body (blank for none): ');

  let body = null;
  if (bodyStr) {
    try {
      body = JSON.parse(bodyStr);
    } catch {
      console.log(c.error('Invalid JSON, sending as-is'));
      body = bodyStr;
    }
  }

  console.log(c.info(`Sending ${method} ${path}...`));
  const res = await request(method.toUpperCase(), path, body);
  printResponse(res);
}

// ============================================
// SETTINGS
// ============================================
async function settingsMenu() {
  console.log(c.header('SETTINGS'));
  console.log(c.menu('1', `Set API URL (current: ${CONFIG.baseUrl})`));
  console.log(c.menu('2', 'Set Auth Token Manually'));
  console.log(c.menu('3', 'Clear Session'));
  console.log(c.menu('4', 'View Current Config'));
  console.log(c.menu('0', 'Back'));

  const choice = await prompt('\nChoice: ');

  switch (choice) {
    case '1': {
      const url = await prompt('New API URL: ');
      if (url) {
        CONFIG.baseUrl = url;
        console.log(c.success(`API URL set to: ${url}`));
      }
      break;
    }
    case '2': {
      const token = await prompt('Bearer Token: ');
      if (token) {
        CONFIG.token = token;
        console.log(c.success('Token set!'));
      }
      break;
    }
    case '3': {
      CONFIG.token = '';
      CONFIG.refreshToken = '';
      CONFIG.userId = '';
      CONFIG.vendorId = '';
      console.log(c.success('Session cleared'));
      break;
    }
    case '4': {
      console.log(c.header('CURRENT CONFIG'));
      console.log(`API URL: ${c.highlight(CONFIG.baseUrl)}`);
      console.log(`Token: ${CONFIG.token ? c.highlight(CONFIG.token.substring(0, 40) + '...') : c.dim('(none)')}`);
      console.log(`User ID: ${CONFIG.userId || c.dim('(none)')}`);
      console.log(`Vendor ID: ${CONFIG.vendorId || c.dim('(none)')}`);
      break;
    }
    case '0':
      return;
    default:
      console.log(c.warn('Invalid choice'));
  }

  await settingsMenu();
}

// ============================================
// MAIN MENU
// ============================================
async function mainMenu() {
  console.clear();
  console.log(`
${colors.bright}${colors.cyan}
  ██████╗  █████╗  █████╗ ███████╗████████╗ █████╗  █████╗ 
  ██╔══██╗██╔══██╗██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔══██╗
  ██████╔╝███████║███████║███████╗   ██║   ███████║███████║
  ██╔══██╗██╔══██║██╔══██║╚════██║   ██║   ██╔══██║██╔══██║
  ██║  ██║██║  ██║██║  ██║███████║   ██║   ██║  ██║██║  ██║
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
${colors.reset}
  ${c.dim('Backend API Testing TUI')}
  ${c.dim(`Connected to: ${CONFIG.baseUrl}`)}
  ${CONFIG.token ? c.success(`Authenticated (${CONFIG.phone || CONFIG.userId.slice(0, 8) + '...'})`) : c.warn('Not authenticated')}
`);

  console.log(c.menu('0', '🔑 Quick Login (OTP)'));
  console.log(c.menu('1', '🔐 Authentication'));
  console.log(c.menu('2', '👤 Users'));
  console.log(c.menu('3', '🏪 Vendors'));
  console.log(c.menu('4', '📝 Posts'));
  console.log(c.menu('5', '👥 Social'));
  console.log(c.menu('6', '🗺️  Expeditions'));
  console.log(c.menu('7', '⭐ Ratings'));
  console.log(c.menu('8', '🍾 BottleCaps'));
  console.log(c.menu('9', '🔔 Notifications'));
  console.log(c.menu('A', '👑 Admin'));
  console.log(c.menu('R', '📡 Raw Request'));
  console.log(c.menu('S', '⚙️  Settings'));
  console.log(c.menu('H', '💚 Health Check'));
  console.log(c.menu('Q', '🚪 Quit'));

  const choice = await prompt('\nChoice: ');

  try {
    switch (choice.toUpperCase()) {
      case '0':
        await quickLogin();
        break;
      case '1':
        await authMenu();
        break;
      case '2':
        await usersMenu();
        break;
      case '3':
        await vendorsMenu();
        break;
      case '4':
        await postsMenu();
        break;
      case '5':
        await socialMenu();
        break;
      case '6':
        await expeditionsMenu();
        break;
      case '7':
        await ratingsMenu();
        break;
      case '8':
        await bottlecapsMenu();
        break;
      case '9':
        await notificationsMenu();
        break;
      case 'A':
        await adminMenu();
        break;
      case 'R':
        await rawRequestMenu();
        break;
      case 'S':
        await settingsMenu();
        break;
      case 'H':
        console.log(c.info('Checking health...'));
        const res = await request('GET', '/health');
        if (res.status === 200) {
          console.log(c.success(`API is healthy! Uptime: ${res.data.uptime?.toFixed(0) || 'N/A'}s`));
        } else {
          printResponse(res);
        }
        break;
      case 'Q':
        console.log(c.success('Goodbye! 👋'));
        rl.close();
        process.exit(0);
      default:
        console.log(c.warn('Invalid choice'));
    }
  } catch (error: any) {
    console.log(c.error(`Error: ${error.message}`));
  }

  await prompt('\nPress Enter to continue...');
  await mainMenu();
}

// ============================================
// ENTRY POINT
// ============================================
console.log(c.info('Starting Raastaa TUI...'));
console.log(c.dim('Tip: Run with --routes to see all API endpoints'));
console.log('');

mainMenu().catch((err) => {
  console.error(c.error(`Fatal error: ${err.message}`));
  process.exit(1);
});
