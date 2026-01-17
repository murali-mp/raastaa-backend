-- CreateTable
CREATE TABLE "User" (
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "profile_picture" TEXT,
    "food_preferences" TEXT[],
    "referral_source" TEXT,
    "bio" VARCHAR(500),
    "social_links" JSONB,
    "ui_preferences" JSONB NOT NULL DEFAULT '{"theme":"light","language":"en"}',
    "registered_ip" TEXT NOT NULL,
    "is_vendor" BOOLEAN NOT NULL DEFAULT false,
    "account_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "followers_count" INTEGER NOT NULL DEFAULT 0,
    "following_count" INTEGER NOT NULL DEFAULT 0,
    "bottle_caps" BIGINT NOT NULL DEFAULT 0,
    "xp" BIGINT NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "expeditions_completed" INTEGER NOT NULL DEFAULT 0,
    "vendors_visited" INTEGER NOT NULL DEFAULT 0,
    "posts_count" INTEGER NOT NULL DEFAULT 0,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "uuid" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "store_description" VARCHAR(1000) NOT NULL,
    "operating_hours" JSONB NOT NULL,
    "upi_id" TEXT NOT NULL,
    "menu_photos" TEXT[],
    "stall_photos" TEXT[],
    "primary_lat" DOUBLE PRECISION NOT NULL,
    "primary_lng" DOUBLE PRECISION NOT NULL,
    "food_categories" TEXT[],
    "rating_hygiene" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_taste" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_recommend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_overall" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_ratings" INTEGER NOT NULL DEFAULT 0,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "is_currently_open" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" TEXT,
    "price_range" TEXT NOT NULL DEFAULT 'MODERATE',
    "specialties" TEXT[],
    "tags" TEXT[],
    "followers_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "uuid" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" VARCHAR(500),
    "price" DOUBLE PRECISION NOT NULL,
    "image_url" TEXT,
    "category" TEXT,
    "is_veg" BOOLEAN NOT NULL DEFAULT true,
    "is_bestseller" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "UserFollows" (
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollows_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "VendorFollows" (
    "user_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VendorFollows_pkey" PRIMARY KEY ("user_id","vendor_id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "user_a" TEXT NOT NULL,
    "user_b" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "initiated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorLocation" (
    "vendor_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy_meters" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorLocation_pkey" PRIMARY KEY ("vendor_id")
);

-- CreateTable
CREATE TABLE "Post" (
    "uuid" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "expedition_id" TEXT,
    "content_type" TEXT NOT NULL,
    "text_content" VARCHAR(2000),
    "media_urls" TEXT[],
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "shares_count" INTEGER NOT NULL DEFAULT 0,
    "saves_count" INTEGER NOT NULL DEFAULT 0,
    "hashtags" TEXT[],
    "mentions" TEXT[],
    "location_lat" DOUBLE PRECISION,
    "location_lng" DOUBLE PRECISION,
    "location_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "edited_at" TIMESTAMP(3),
    "is_edited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "SavedPost" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "uuid" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "reply_to_user_id" TEXT,
    "parent_comment_id" TEXT,
    "content" VARCHAR(500) NOT NULL,
    "mentions" TEXT[],
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(3),
    "is_edited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expedition" (
    "uuid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "planned_date" DATE NOT NULL,
    "start_time" TEXT,
    "cover_image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "vendor_count" INTEGER NOT NULL DEFAULT 0,
    "estimated_duration_mins" INTEGER,
    "max_participants" INTEGER NOT NULL DEFAULT 10,
    "actual_duration_mins" INTEGER,
    "total_spent" DOUBLE PRECISION,
    "distance_walked_meters" INTEGER,
    "bottle_caps_earned" INTEGER NOT NULL DEFAULT 0,
    "achievements_unlocked" TEXT[],
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expedition_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "ExpeditionParticipant" (
    "expedition_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PARTICIPANT',
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "joined_at" TIMESTAMP(3),

    CONSTRAINT "ExpeditionParticipant_pkey" PRIMARY KEY ("expedition_id","user_id")
);

-- CreateTable
CREATE TABLE "ExpeditionVendor" (
    "expedition_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "visited_at" TIMESTAMP(3),
    "rating_submitted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "ExpeditionVendor_pkey" PRIMARY KEY ("expedition_id","vendor_id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "uuid" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "expedition_id" TEXT,
    "hygiene" INTEGER NOT NULL,
    "value_for_money" INTEGER NOT NULL,
    "taste" INTEGER NOT NULL,
    "recommendation" INTEGER NOT NULL,
    "review_text" VARCHAR(1000),
    "photos" TEXT[],
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "BottleCapTransaction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "description" TEXT,
    "balance_after" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BottleCapTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon_url" TEXT,
    "category" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "caps_reward" INTEGER NOT NULL DEFAULT 0,
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "criteria" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" JSONB,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentFlag" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" VARCHAR(500),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "action_taken" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "uses_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralUse" (
    "id" TEXT NOT NULL,
    "referral_code_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "caps_awarded" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_account_status_idx" ON "User"("account_status");

-- CreateIndex
CREATE INDEX "User_created_at_idx" ON "User"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_email_key" ON "Vendor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_phone_key" ON "Vendor"("phone");

-- CreateIndex
CREATE INDEX "Vendor_store_name_idx" ON "Vendor"("store_name");

-- CreateIndex
CREATE INDEX "Vendor_food_categories_idx" ON "Vendor"("food_categories");

-- CreateIndex
CREATE INDEX "Vendor_verification_status_idx" ON "Vendor"("verification_status");

-- CreateIndex
CREATE INDEX "Vendor_rating_overall_idx" ON "Vendor"("rating_overall");

-- CreateIndex
CREATE INDEX "Vendor_created_at_idx" ON "Vendor"("created_at");

-- CreateIndex
CREATE INDEX "MenuItem_vendor_id_idx" ON "MenuItem"("vendor_id");

-- CreateIndex
CREATE INDEX "UserFollows_following_id_idx" ON "UserFollows"("following_id");

-- CreateIndex
CREATE INDEX "UserFollows_follower_id_idx" ON "UserFollows"("follower_id");

-- CreateIndex
CREATE INDEX "VendorFollows_vendor_id_idx" ON "VendorFollows"("vendor_id");

-- CreateIndex
CREATE INDEX "VendorFollows_user_id_idx" ON "VendorFollows"("user_id");

-- CreateIndex
CREATE INDEX "Friendship_user_a_idx" ON "Friendship"("user_a");

-- CreateIndex
CREATE INDEX "Friendship_user_b_idx" ON "Friendship"("user_b");

-- CreateIndex
CREATE INDEX "Friendship_status_idx" ON "Friendship"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_user_a_user_b_key" ON "Friendship"("user_a", "user_b");

-- CreateIndex
CREATE INDEX "Post_author_id_created_at_idx" ON "Post"("author_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Post_vendor_id_created_at_idx" ON "Post"("vendor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Post_created_at_idx" ON "Post"("created_at" DESC);

-- CreateIndex
CREATE INDEX "Post_hashtags_idx" ON "Post"("hashtags");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE INDEX "SavedPost_user_id_idx" ON "SavedPost"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPost_user_id_post_id_key" ON "SavedPost"("user_id", "post_id");

-- CreateIndex
CREATE INDEX "Comment_post_id_created_at_idx" ON "Comment"("post_id", "created_at" ASC);

-- CreateIndex
CREATE INDEX "Comment_author_id_idx" ON "Comment"("author_id");

-- CreateIndex
CREATE INDEX "Like_target_type_target_id_idx" ON "Like"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "Like_user_id_idx" ON "Like"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Like_user_id_target_type_target_id_key" ON "Like"("user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "Expedition_creator_id_status_idx" ON "Expedition"("creator_id", "status");

-- CreateIndex
CREATE INDEX "Expedition_planned_date_idx" ON "Expedition"("planned_date");

-- CreateIndex
CREATE INDEX "Expedition_status_idx" ON "Expedition"("status");

-- CreateIndex
CREATE INDEX "Expedition_is_public_planned_date_idx" ON "Expedition"("is_public", "planned_date");

-- CreateIndex
CREATE INDEX "ExpeditionParticipant_user_id_idx" ON "ExpeditionParticipant"("user_id");

-- CreateIndex
CREATE INDEX "ExpeditionVendor_expedition_id_order_index_idx" ON "ExpeditionVendor"("expedition_id", "order_index");

-- CreateIndex
CREATE INDEX "Rating_vendor_id_idx" ON "Rating"("vendor_id");

-- CreateIndex
CREATE INDEX "Rating_created_at_idx" ON "Rating"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_user_id_vendor_id_key" ON "Rating"("user_id", "vendor_id");

-- CreateIndex
CREATE INDEX "BottleCapTransaction_user_id_created_at_idx" ON "BottleCapTransaction"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "BottleCapTransaction_action_type_idx" ON "BottleCapTransaction"("action_type");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE INDEX "Achievement_category_idx" ON "Achievement"("category");

-- CreateIndex
CREATE INDEX "Achievement_tier_idx" ON "Achievement"("tier");

-- CreateIndex
CREATE INDEX "UserAchievement_user_id_idx" ON "UserAchievement"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_user_id_achievement_id_key" ON "UserAchievement"("user_id", "achievement_id");

-- CreateIndex
CREATE INDEX "ContentFlag_target_type_target_id_idx" ON "ContentFlag"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "ContentFlag_status_idx" ON "ContentFlag"("status");

-- CreateIndex
CREATE INDEX "ContentFlag_created_at_idx" ON "ContentFlag"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_user_id_key" ON "ReferralCode"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_code_idx" ON "ReferralCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralUse_referred_user_id_key" ON "ReferralUse"("referred_user_id");

-- CreateIndex
CREATE INDEX "ReferralUse_referral_code_id_idx" ON "ReferralUse"("referral_code_id");

-- CreateIndex
CREATE INDEX "Notification_user_id_is_read_idx" ON "Notification"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "Notification_user_id_created_at_idx" ON "Notification"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "AdminLog_admin_id_idx" ON "AdminLog"("admin_id");

-- CreateIndex
CREATE INDEX "AdminLog_action_idx" ON "AdminLog"("action");

-- CreateIndex
CREATE INDEX "AdminLog_created_at_idx" ON "AdminLog"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollows" ADD CONSTRAINT "UserFollows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollows" ADD CONSTRAINT "UserFollows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorFollows" ADD CONSTRAINT "VendorFollows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorFollows" ADD CONSTRAINT "VendorFollows_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_user_a_fkey" FOREIGN KEY ("user_a") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_user_b_fkey" FOREIGN KEY ("user_b") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorLocation" ADD CONSTRAINT "VendorLocation_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Post"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "Post"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expedition" ADD CONSTRAINT "Expedition_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpeditionParticipant" ADD CONSTRAINT "ExpeditionParticipant_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "Expedition"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpeditionParticipant" ADD CONSTRAINT "ExpeditionParticipant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpeditionVendor" ADD CONSTRAINT "ExpeditionVendor_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "Expedition"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpeditionVendor" ADD CONSTRAINT "ExpeditionVendor_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleCapTransaction" ADD CONSTRAINT "BottleCapTransaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFlag" ADD CONSTRAINT "ContentFlag_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralUse" ADD CONSTRAINT "ReferralUse_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralUse" ADD CONSTRAINT "ReferralUse_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
