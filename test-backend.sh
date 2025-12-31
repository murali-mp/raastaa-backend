#!/bin/bash
set -euo pipefail

echo "🧪 Testing Raastaa Backend API (end-to-end smoke)"
echo "=================================================="
echo ""

# Override with: BASE_URL=http://localhost:3001 ./test-backend.sh
BASE_URL="${BASE_URL:-https://raastaa-app-duuy3.ondigitalocean.app}"

# Verbose request/response logging.
# Disable with: VERBOSE=0 ./test-backend.sh
VERBOSE="${VERBOSE:-1}"

# When set to 1, the script will fail if newer behaviors
# (like review override semantics) are not enforced by the backend.
EXPECT_REVIEW_OVERRIDE="${EXPECT_REVIEW_OVERRIDE:-0}"



require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Missing dependency: $1"
    exit 1
  fi
}

require_cmd curl
require_cmd jq

PASS=0
FAIL=0

section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

json_field() {
  local body="$1"
  local query="$2"
  echo "$body" | jq -r "$query" 2>/dev/null || true
}

json_number() {
  local body="$1"
  local query="$2"
  local value
  value=$(echo "$body" | jq "$query" 2>/dev/null || true)
  if [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "$value"
  else
    echo "0"
  fi
}

redact_pretty() {
  # Redacts any JSON keys containing "token" or "password" (case-insensitive), at any depth.
  local body="$1"
  echo "$body" | jq 'walk(if type=="object" then with_entries(if (.key|test("token|password";"i")) then .value="<redacted>" else . end) else . end)' 2>/dev/null || echo "$body"
}

pass() {
  PASS=$((PASS + 1))
  echo "✅ $1"
}

fail() {
  FAIL=$((FAIL + 1))
  echo "❌ $1"
}

http_get() {
  local url="$1"
  if [ "$VERBOSE" = "1" ]; then
    echo "" >&2
    echo "➡️  GET $url" >&2
  fi
  local resp
  resp=$(curl -sS "$url")
  if [ "$VERBOSE" = "1" ]; then
    echo "⬅️  Response:" >&2
    redact_pretty "$resp" >&2
  fi
  echo "$resp"
}

http_get_auth() {
  local url="$1"
  local token="$2"
  if [ "$VERBOSE" = "1" ]; then
    echo "" >&2
    echo "➡️  GET $url" >&2
    echo "    Authorization: Bearer <redacted>" >&2
  fi
  local resp
  resp=$(curl -sS -H "Authorization: Bearer $token" "$url")
  if [ "$VERBOSE" = "1" ]; then
    echo "⬅️  Response:" >&2
    redact_pretty "$resp" >&2
  fi
  echo "$resp"
}

http_post_json() {
  local url="$1"
  local json="$2"
  if [ "$VERBOSE" = "1" ]; then
    echo "" >&2
    echo "➡️  POST $url" >&2
    echo "    Content-Type: application/json" >&2
    echo "    Body:" >&2
    redact_pretty "$json" >&2
  fi
  local resp
  resp=$(curl -sS -H "Content-Type: application/json" -d "$json" "$url")
  if [ "$VERBOSE" = "1" ]; then
    echo "⬅️  Response:" >&2
    redact_pretty "$resp" >&2
  fi
  echo "$resp"
}

http_post_json_auth() {
  local url="$1"
  local token="$2"
  local json="$3"
  if [ "$VERBOSE" = "1" ]; then
    echo "" >&2
    echo "➡️  POST $url" >&2
    echo "    Authorization: Bearer <redacted>" >&2
    echo "    Content-Type: application/json" >&2
    echo "    Body:" >&2
    redact_pretty "$json" >&2
  fi
  local resp
  resp=$(curl -sS -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$json" "$url")
  if [ "$VERBOSE" = "1" ]; then
    echo "⬅️  Response:" >&2
    redact_pretty "$resp" >&2
  fi
  echo "$resp"
}

http_put_json_auth() {
  local url="$1"
  local token="$2"
  local json="$3"
  if [ "$VERBOSE" = "1" ]; then
    echo "" >&2
    echo "➡️  PUT $url" >&2
    echo "    Authorization: Bearer <redacted>" >&2
    echo "    Content-Type: application/json" >&2
    echo "    Body:" >&2
    redact_pretty "$json" >&2
  fi
  local resp
  resp=$(curl -sS -X PUT -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$json" "$url")
  if [ "$VERBOSE" = "1" ]; then
    echo "⬅️  Response:" >&2
    redact_pretty "$resp" >&2
  fi
  echo "$resp"
}

assert_status_success() {
  local body="$1"
  local label="$2"
  local status
  status=$(json_field "$body" '.status // empty')
  if [ "$status" = "success" ] || [ "$status" = "ok" ]; then
    pass "$label"
    return 0
  fi
  echo "   Response: $body" | head -c 2000
  echo ""
  fail "$label"
  return 1
}

rand_suffix() {
  date +%s | tr -d '\n'
}

section "1) Health"
HEALTH_BODY=$(http_get "$BASE_URL/health")
HEALTH_STATUS=$(json_field "$HEALTH_BODY" '.status // empty')
if [ "$HEALTH_STATUS" = "ok" ]; then
  pass "Health check"
else
  echo "   Response: $HEALTH_BODY"
  fail "Health check"
  exit 1
fi

section "2) Auth + Users"
SUFFIX=$(rand_suffix)
EMAIL1="test_${SUFFIX}@example.com"
USER1="testuser_${SUFFIX}"
PASS1="password123"

SIGNUP_BODY=$(http_post_json "$BASE_URL/api/v1/auth/signup" "{\"email\":\"$EMAIL1\",\"password\":\"$PASS1\",\"username\":\"$USER1\",\"displayName\":\"Test User $SUFFIX\"}")
assert_status_success "$SIGNUP_BODY" "Auth signup"

ACCESS_TOKEN=$(json_field "$SIGNUP_BODY" '.data.tokens.accessToken // empty')
USER_ID=$(json_field "$SIGNUP_BODY" '.data.user.id // empty')
if [ -n "$ACCESS_TOKEN" ] && [ -n "$USER_ID" ]; then
  pass "Auth tokens returned"
else
  echo "   Response: $SIGNUP_BODY" | head -c 2000
  echo ""
  fail "Auth tokens returned"
  exit 1
fi

ME_BODY=$(http_get_auth "$BASE_URL/api/v1/users/me" "$ACCESS_TOKEN")
if [ "$(json_field "$ME_BODY" '.status // empty')" = "success" ]; then
  ME_ID=$(json_field "$ME_BODY" '.data.id // empty')
  if [ -n "$ME_ID" ]; then
    pass "Users me"
  else
    fail "Users me (missing id)"
  fi
else
  echo "   Response: $ME_BODY" | head -c 2000
  echo ""
  fail "Users me"
fi

PROFILE_BODY=$(http_put_json_auth "$BASE_URL/api/v1/users/profile" "$ACCESS_TOKEN" "{\"displayName\":\"Updated $SUFFIX\"}")
if [ "$(json_field "$PROFILE_BODY" '.status // empty')" = "success" ]; then
  pass "Users profile update"
else
  echo "   Response: $PROFILE_BODY" | head -c 2000
  echo ""
  fail "Users profile update"
fi

# Create second user to test follow/unfollow
EMAIL2="test2_${SUFFIX}@example.com"
USER2="testuser2_${SUFFIX}"
SIGNUP2_BODY=$(http_post_json "$BASE_URL/api/v1/auth/signup" "{\"email\":\"$EMAIL2\",\"password\":\"$PASS1\",\"username\":\"$USER2\",\"displayName\":\"Test2 $SUFFIX\"}")
assert_status_success "$SIGNUP2_BODY" "Auth signup (user2)"
USER2_ID=$(json_field "$SIGNUP2_BODY" '.data.user.id // empty')
if [ -n "$USER2_ID" ]; then
  pass "User2 created"
else
  fail "User2 created"
fi

FOLLOW_BODY=$(http_post_json_auth "$BASE_URL/api/v1/users/$USER2_ID/follow" "$ACCESS_TOKEN" "{}")
if [ "$(json_field "$FOLLOW_BODY" '.status // empty')" = "success" ]; then
  pass "Follow user"
else
  echo "   Response: $FOLLOW_BODY" | head -c 2000
  echo ""
  fail "Follow user"
fi

STATS_BODY=$(http_get_auth "$BASE_URL/api/v1/users/$USER2_ID/stats" "$ACCESS_TOKEN")
if [ "$(json_field "$STATS_BODY" '.status // empty')" = "success" ]; then
  pass "User stats"
else
  echo "   Response: $STATS_BODY" | head -c 2000
  echo ""
  fail "User stats"
fi

FOLLOWERS_BODY=$(http_get "$BASE_URL/api/v1/users/$USER2_ID/followers")
if [ "$(json_field "$FOLLOWERS_BODY" '.status // empty')" = "success" ]; then
  pass "User followers"
else
  echo "   Response: $FOLLOWERS_BODY" | head -c 2000
  echo ""
  fail "User followers"
fi

UNFOLLOW_BODY=$(http_post_json_auth "$BASE_URL/api/v1/users/$USER2_ID/unfollow" "$ACCESS_TOKEN" "{}")
if [ "$(json_field "$UNFOLLOW_BODY" '.status // empty')" = "success" ]; then
  pass "Unfollow user"
else
  echo "   Response: $UNFOLLOW_BODY" | head -c 2000
  echo ""
  fail "Unfollow user"
fi

section "3) Tags"
TAGS_BODY=$(http_get "$BASE_URL/api/v1/tags")
if [ "$(json_field "$TAGS_BODY" '.status // empty')" = "success" ]; then
  TAG_COUNT=$(json_number "$TAGS_BODY" '.data.tags | length')
  pass "Tags list (count=$TAG_COUNT)"
else
  echo "   Response: $TAGS_BODY" | head -c 2000
  echo ""
  fail "Tags list"
fi

section "4) Vendors"
NEARBY_BODY=$(http_get "$BASE_URL/api/v1/vendors/nearby?latitude=12.9716&longitude=77.5946&radius=10000&limit=10")
if [ "$(json_field "$NEARBY_BODY" '.status // empty')" = "success" ]; then
  VENDOR_COUNT=$(json_number "$NEARBY_BODY" '.data.vendors | length')
  pass "Vendors nearby (count=$VENDOR_COUNT)"
else
  echo "   Response: $NEARBY_BODY" | head -c 2000
  echo ""
  fail "Vendors nearby"
  VENDOR_COUNT=0
fi

FEATURED_BODY=$(http_get "$BASE_URL/api/v1/vendors")
if [ "$(json_field "$FEATURED_BODY" '.status // empty')" = "success" ]; then
  pass "Vendors featured"
else
  echo "   Response: $FEATURED_BODY" | head -c 2000
  echo ""
  fail "Vendors featured"
fi

SEARCH_BODY=$(http_get "$BASE_URL/api/v1/vendors/search?q=dosa&limit=5")
if [ "$(json_field "$SEARCH_BODY" '.status // empty')" = "success" ]; then
  pass "Vendors search"
else
  echo "   Response: $SEARCH_BODY" | head -c 2000
  echo ""
  fail "Vendors search"
fi

VENDOR_ID=$(json_field "$NEARBY_BODY" '.data.vendors[0].id // empty')
VENDOR_LAT=$(json_field "$NEARBY_BODY" '.data.vendors[0].location.latitude // empty')
VENDOR_LNG=$(json_field "$NEARBY_BODY" '.data.vendors[0].location.longitude // empty')

if [ -n "$VENDOR_ID" ]; then
  DETAIL_BODY=$(http_get "$BASE_URL/api/v1/vendors/$VENDOR_ID")
  if [ "$(json_field "$DETAIL_BODY" '.status // empty')" = "success" ]; then
    pass "Vendor detail"
  else
    echo "   Response: $DETAIL_BODY" | head -c 2000
    echo ""
    fail "Vendor detail"
  fi

  MENU_BODY=$(http_get "$BASE_URL/api/v1/vendors/$VENDOR_ID/menu")
  if [ "$(json_field "$MENU_BODY" '.status // empty')" = "success" ]; then
    pass "Vendor menu"
  else
    echo "   Response: $MENU_BODY" | head -c 2000
    echo ""
    fail "Vendor menu"
  fi
else
  echo "⚠️  Skipping vendor detail/menu (no vendors available)"
fi

section "5) Visits"
if [ -n "$VENDOR_ID" ] && [ -n "$VENDOR_LAT" ] && [ -n "$VENDOR_LNG" ]; then
  VISIT_BODY=$(http_post_json_auth "$BASE_URL/api/v1/visits" "$ACCESS_TOKEN" "{\"vendorId\":\"$VENDOR_ID\",\"latitude\":$VENDOR_LAT,\"longitude\":$VENDOR_LNG}")
  if [ "$(json_field "$VISIT_BODY" '.status // empty')" = "success" ]; then
    pass "Record visit"
  else
    echo "   Response: $VISIT_BODY" | head -c 2000
    echo ""
    fail "Record visit"
  fi
else
  echo "⚠️  Skipping visits (no vendor coords)"
fi

section "6) Feed / Posts"
FEED_BODY=$(http_get_auth "$BASE_URL/api/v1/posts?limit=5" "$ACCESS_TOKEN")
if [ "$(json_field "$FEED_BODY" '.status // empty')" = "success" ]; then
  pass "Fetch feed"
else
  echo "   Response: $FEED_BODY" | head -c 2000
  echo ""
  fail "Fetch feed"
fi

CREATE_POST_JSON=""
if [ -n "$VENDOR_ID" ]; then
  CREATE_POST_JSON="{\"body\":\"Hello from smoke test $SUFFIX\",\"vendorId\":\"$VENDOR_ID\",\"postType\":\"review\"}"
else
  CREATE_POST_JSON="{\"body\":\"Hello from smoke test $SUFFIX\",\"postType\":\"tip\"}"
fi

CREATE_POST_BODY=$(http_post_json_auth "$BASE_URL/api/v1/posts" "$ACCESS_TOKEN" "$CREATE_POST_JSON")
if [ "$(json_field "$CREATE_POST_BODY" '.status // empty')" = "success" ]; then
  pass "Create post (lowercase postType accepted)"
  POST_ID=$(json_field "$CREATE_POST_BODY" '.data.id // empty')
else
  echo "   Response: $CREATE_POST_BODY" | head -c 2000
  echo ""
  fail "Create post"
  POST_ID=""
fi

if [ -n "${POST_ID:-}" ]; then
  LIKE_BODY=$(http_post_json_auth "$BASE_URL/api/v1/posts/$POST_ID/like" "$ACCESS_TOKEN" "{}")
  if [ "$(json_field "$LIKE_BODY" '.status // empty')" = "success" ]; then
    pass "Like post"
  else
    echo "   Response: $LIKE_BODY" | head -c 2000
    echo ""
    fail "Like post"
  fi

  SAVE_BODY=$(http_post_json_auth "$BASE_URL/api/v1/posts/$POST_ID/save" "$ACCESS_TOKEN" "{}")
  if [ "$(json_field "$SAVE_BODY" '.status // empty')" = "success" ]; then
    pass "Save post"
  else
    echo "   Response: $SAVE_BODY" | head -c 2000
    echo ""
    fail "Save post"
  fi

  ADD_COMMENT_BODY=$(http_post_json_auth "$BASE_URL/api/v1/posts/$POST_ID/comments" "$ACCESS_TOKEN" "{\"body\":\"Nice! $SUFFIX\"}")
  if [ "$(json_field "$ADD_COMMENT_BODY" '.status // empty')" = "success" ]; then
    pass "Add comment"
  else
    echo "   Response: $ADD_COMMENT_BODY" | head -c 2000
    echo ""
    fail "Add comment"
  fi

  COMMENTS_BODY=$(http_get "$BASE_URL/api/v1/posts/$POST_ID/comments")
  if [ "$(json_field "$COMMENTS_BODY" '.status // empty')" = "success" ]; then
    pass "Fetch comments"
  else
    echo "   Response: $COMMENTS_BODY" | head -c 2000
    echo ""
    fail "Fetch comments"
  fi
else
  echo "⚠️  Skipping like/save/comments (post creation failed)"
fi

# Review override: second review for same vendor should replace the first
# Strict only for local backend or when EXPECT_REVIEW_OVERRIDE=1.
EXPECT_REVIEW_OVERRIDE_EFFECTIVE="$EXPECT_REVIEW_OVERRIDE"
if echo "$BASE_URL" | grep -Eq "localhost|127\.0\.0\.1"; then
  EXPECT_REVIEW_OVERRIDE_EFFECTIVE="1"
fi

if [ -n "$VENDOR_ID" ] && [ -n "${POST_ID:-}" ]; then
  SECOND_REVIEW_JSON="{\"body\":\"Updated review $SUFFIX\",\"vendorId\":\"$VENDOR_ID\",\"postType\":\"review\"}"
  SECOND_REVIEW_BODY=$(http_post_json_auth "$BASE_URL/api/v1/posts" "$ACCESS_TOKEN" "$SECOND_REVIEW_JSON")
  if [ "$(json_field "$SECOND_REVIEW_BODY" '.status // empty')" = "success" ]; then
    pass "Create second review (override allowed)"
    SECOND_POST_ID=$(json_field "$SECOND_REVIEW_BODY" '.data.id // empty')

    USER_POSTS_BODY=$(http_get_auth "$BASE_URL/api/v1/users/$ME_ID/posts?limit=50" "$ACCESS_TOKEN")
    REVIEW_COUNT=$(echo "$USER_POSTS_BODY" | jq -r --arg vid "$VENDOR_ID" '.data.posts | map(select(.vendorId==$vid and (.postType|tostring|test("review";"i")))) | length' 2>/dev/null || echo "0")
    LATEST_REVIEW_ID=$(echo "$USER_POSTS_BODY" | jq -r --arg vid "$VENDOR_ID" '.data.posts | map(select(.vendorId==$vid and (.postType|tostring|test("review";"i")))) | .[0].id // empty' 2>/dev/null || echo "")

    if [ "$REVIEW_COUNT" = "1" ] && [ -n "$SECOND_POST_ID" ] && [ "$LATEST_REVIEW_ID" = "$SECOND_POST_ID" ]; then
      pass "Review override confirmed (1 review per vendor per user)"
    else
      if [ "$EXPECT_REVIEW_OVERRIDE_EFFECTIVE" = "1" ]; then
        echo "   User posts response: $USER_POSTS_BODY" | head -c 2000
        echo ""
        fail "Review override not enforced"
      else
        echo "⚠️  Review override not enforced on this backend (set EXPECT_REVIEW_OVERRIDE=1 to require it)"
      fi
    fi
  else
    echo "   Response: $SECOND_REVIEW_BODY" | head -c 2000
    echo ""
    fail "Create second review (override)"
  fi
else
  echo "⚠️  Skipping review override test (no vendor or post creation failed)"
fi

section "7) Wallet"
WALLET_BODY=$(http_get_auth "$BASE_URL/api/v1/wallet" "$ACCESS_TOKEN")
if [ "$(json_field "$WALLET_BODY" '.status // empty')" = "success" ]; then
  pass "Fetch wallet"
else
  echo "   Response: $WALLET_BODY" | head -c 2000
  echo ""
  fail "Fetch wallet"
fi

TX_BODY=$(http_get_auth "$BASE_URL/api/v1/wallet/transactions?limit=10" "$ACCESS_TOKEN")
if [ "$(json_field "$TX_BODY" '.status // empty')" = "success" ]; then
  pass "Fetch wallet transactions"
else
  echo "   Response: $TX_BODY" | head -c 2000
  echo ""
  fail "Fetch wallet transactions"
fi

section "8) Challenges"
CH_BODY=$(http_get_auth "$BASE_URL/api/v1/challenges" "$ACCESS_TOKEN")
if [ "$(json_field "$CH_BODY" '.status // empty')" = "success" ]; then
  pass "Fetch challenges"
else
  echo "   Response: $CH_BODY" | head -c 2000
  echo ""
  fail "Fetch challenges"
fi

# Claim endpoint existence test (should be success or a validation error, but not 404)
CLAIM_BODY=$(http_post_json_auth "$BASE_URL/api/v1/challenges/claim" "$ACCESS_TOKEN" "{\"challengeId\":\"00000000-0000-0000-0000-000000000000\"}")
CLAIM_STATUS=$(json_field "$CLAIM_BODY" '.status // empty')
if [ "$CLAIM_STATUS" = "success" ] || [ "$CLAIM_STATUS" = "error" ]; then
  pass "Challenges claim endpoint reachable"
else
  echo "   Response: $CLAIM_BODY" | head -c 2000
  echo ""
  fail "Challenges claim endpoint reachable"
fi

echo ""
echo "=================================================="
echo "📊 Summary"
echo "=================================================="
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [ "$FAIL" -eq 0 ]; then
  echo "🎉 All backend smoke tests passed"
  exit 0
else
  echo "⚠️  Some backend smoke tests failed"
  exit 1
fi
