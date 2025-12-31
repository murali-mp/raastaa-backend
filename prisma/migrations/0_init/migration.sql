-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('email', 'apple', 'google');

-- CreateEnum
CREATE TYPE "vendor_status" AS ENUM ('active', 'pending', 'suspended', 'closed');

-- CreateEnum
CREATE TYPE "price_band" AS ENUM ('$', '$$', '$$$', '$$$$');

-- CreateEnum
CREATE TYPE "ownership_role" AS ENUM ('owner', 'manager', 'staff');

-- CreateEnum
CREATE TYPE "tag_category" AS ENUM ('cuisine', 'vibe', 'feature', 'dietary');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('visible', 'hidden', 'flagged');

-- CreateEnum
CREATE TYPE "rating_dimension" AS ENUM ('food', 'service', 'ambience', 'value');

-- CreateEnum
CREATE TYPE "interaction_type" AS ENUM ('helpful', 'not_helpful');

-- CreateEnum
CREATE TYPE "verification_method" AS ENUM ('gps', 'receipt', 'qr_code', 'photo');

-- CreateEnum
CREATE TYPE "evidence_type" AS ENUM ('gps_log', 'receipt_image', 'photo', 'qr_scan');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "moderation_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "post_type" AS ENUM ('review', 'tip', 'photo', 'checkin');

-- CreateEnum
CREATE TYPE "post_status" AS ENUM ('visible', 'hidden', 'flagged');

-- CreateEnum
CREATE TYPE "feed_interaction_type" AS ENUM ('like', 'save', 'share');

-- CreateEnum
CREATE TYPE "comment_status" AS ENUM ('visible', 'hidden', 'flagged');

-- CreateEnum
CREATE TYPE "transaction_reason" AS ENUM ('review_bonus', 'visit_reward', 'referral', 'challenge_complete', 'adjustment', 'redemption');

-- CreateEnum
CREATE TYPE "challenge_type" AS ENUM ('visit_count', 'review_count', 'tag_explorer', 'streak');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('like', 'comment', 'follow', 'achievement', 'tip', 'review_response');

-- CreateEnum
CREATE TYPE "report_entity_type" AS ENUM ('review', 'post', 'comment', 'user', 'media');

-- CreateEnum
CREATE TYPE "report_reason" AS ENUM ('spam', 'inappropriate', 'fake', 'harassment', 'other');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('open', 'under_review', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "trust_event_type" AS ENUM ('verified_visit', 'helpful_review', 'report_upheld', 'report_dismissed', 'content_removed', 'warning_issued');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "display_name" VARCHAR(100),
    "avatar_media_id" UUID,
    "trust_score" INTEGER NOT NULL DEFAULT 100,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "device_token" VARCHAR(255) NOT NULL,
    "platform" VARCHAR(10) NOT NULL DEFAULT 'ios',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "city" VARCHAR(100),
    "area" VARCHAR(100),
    "full_address" TEXT,
    "plus_code" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "location_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price_band" "price_band",
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "vendor_status" NOT NULL DEFAULT 'active',
    "popularity_score" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_operational_info" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor_id" UUID NOT NULL,
    "opening_hours" JSONB,
    "contact_phone" VARCHAR(20),
    "contact_email" VARCHAR(255),
    "website_url" VARCHAR(500),
    "social_links" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vendor_operational_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_ownership" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ownership_role" NOT NULL DEFAULT 'owner',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(50) NOT NULL,
    "category" "tag_category" NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_tags" (
    "vendor_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_tags_pkey" PRIMARY KEY ("vendor_id","tag_id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price_min" DECIMAL(10,2),
    "price_max" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "visit_id" UUID,
    "headline" VARCHAR(200),
    "body" TEXT,
    "overall_score" INTEGER NOT NULL,
    "status" "review_status" NOT NULL DEFAULT 'visible',
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_ratings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "review_id" UUID NOT NULL,
    "dimension" "rating_dimension" NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "review_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_interactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "review_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "interaction_type" "interaction_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "visited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_method" "verification_method",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_evidence" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "visit_id" UUID NOT NULL,
    "evidence_type" "evidence_type" NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "uploader_id" UUID NOT NULL,
    "media_type" "media_type" NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "thumbnail_url" VARCHAR(1000),
    "file_size_bytes" BIGINT,
    "mime_type" VARCHAR(50),
    "width" INTEGER,
    "height" INTEGER,
    "moderation_status" "moderation_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followers" (
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followers_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "feed_posts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "author_id" UUID NOT NULL,
    "vendor_id" UUID,
    "post_type" "post_type" NOT NULL,
    "body" TEXT,
    "status" "post_status" NOT NULL DEFAULT 'visible',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_post_media" (
    "post_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "feed_post_media_pkey" PRIMARY KEY ("post_id","media_id")
);

-- CreateTable
CREATE TABLE "feed_interactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "interaction_type" "feed_interaction_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "post_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "status" "comment_status" NOT NULL DEFAULT 'visible',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'points',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "wallet_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "transaction_reason" NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "balance_after" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "challenge_type" "challenge_type" NOT NULL,
    "target_count" INTEGER NOT NULL,
    "reward_points" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_progress" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "challenge_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "notification_type" "notification_type" NOT NULL,
    "from_user_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "action_id" UUID,
    "action_type" VARCHAR(30),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "reporter_id" UUID NOT NULL,
    "reported_entity_type" "report_entity_type" NOT NULL,
    "reported_entity_id" UUID NOT NULL,
    "reason" "report_reason" NOT NULL,
    "details" TEXT,
    "status" "report_status" NOT NULL DEFAULT 'open',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "event_type" "trust_event_type" NOT NULL,
    "impact" INTEGER NOT NULL,
    "reference_type" VARCHAR(30),
    "reference_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users" USING GIN ("username" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_user_id_key" ON "auth_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "user_devices_device_token_idx" ON "user_devices"("device_token");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_device_token_key" ON "user_devices"("user_id", "device_token");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "locations_city_idx" ON "locations"("city");

-- CreateIndex
CREATE INDEX "locations_area_idx" ON "locations"("area");

-- CreateIndex
CREATE INDEX "vendors_location_id_idx" ON "vendors"("location_id");

-- CreateIndex
CREATE INDEX "vendors_status_idx" ON "vendors"("status");

-- CreateIndex
CREATE INDEX "vendors_popularity_score_idx" ON "vendors"("popularity_score" DESC);

-- CreateIndex
CREATE INDEX "vendors_name_idx" ON "vendors" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "vendors_is_verified_idx" ON "vendors"("is_verified");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_operational_info_vendor_id_key" ON "vendor_operational_info"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_operational_info_vendor_id_idx" ON "vendor_operational_info"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_ownership_vendor_id_idx" ON "vendor_ownership"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_ownership_user_id_idx" ON "vendor_ownership"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_ownership_vendor_id_user_id_key" ON "vendor_ownership"("vendor_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_category_idx" ON "tags"("category");

-- CreateIndex
CREATE INDEX "vendor_tags_vendor_id_idx" ON "vendor_tags"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_tags_tag_id_idx" ON "vendor_tags"("tag_id");

-- CreateIndex
CREATE INDEX "menu_items_vendor_id_idx" ON "menu_items"("vendor_id");

-- CreateIndex
CREATE INDEX "menu_items_is_available_idx" ON "menu_items"("is_available");

-- CreateIndex
CREATE INDEX "reviews_vendor_id_idx" ON "reviews"("vendor_id");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at" DESC);

-- CreateIndex
CREATE INDEX "reviews_helpful_count_idx" ON "reviews"("helpful_count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_vendor_id_key" ON "reviews"("user_id", "vendor_id");

-- CreateIndex
CREATE INDEX "review_ratings_review_id_idx" ON "review_ratings"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_ratings_review_id_dimension_key" ON "review_ratings"("review_id", "dimension");

-- CreateIndex
CREATE INDEX "review_interactions_review_id_idx" ON "review_interactions"("review_id");

-- CreateIndex
CREATE INDEX "review_interactions_user_id_idx" ON "review_interactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_interactions_review_id_user_id_key" ON "review_interactions"("review_id", "user_id");

-- CreateIndex
CREATE INDEX "visits_user_id_idx" ON "visits"("user_id");

-- CreateIndex
CREATE INDEX "visits_vendor_id_idx" ON "visits"("vendor_id");

-- CreateIndex
CREATE INDEX "visits_visited_at_idx" ON "visits"("visited_at" DESC);

-- CreateIndex
CREATE INDEX "visits_is_verified_idx" ON "visits"("is_verified");

-- CreateIndex
CREATE INDEX "visit_evidence_visit_id_idx" ON "visit_evidence"("visit_id");

-- CreateIndex
CREATE INDEX "media_uploader_id_idx" ON "media"("uploader_id");

-- CreateIndex
CREATE INDEX "media_moderation_status_idx" ON "media"("moderation_status");

-- CreateIndex
CREATE INDEX "media_created_at_idx" ON "media"("created_at" DESC);

-- CreateIndex
CREATE INDEX "followers_follower_id_idx" ON "followers"("follower_id");

-- CreateIndex
CREATE INDEX "followers_following_id_idx" ON "followers"("following_id");

-- CreateIndex
CREATE INDEX "feed_posts_author_id_idx" ON "feed_posts"("author_id");

-- CreateIndex
CREATE INDEX "feed_posts_vendor_id_idx" ON "feed_posts"("vendor_id");

-- CreateIndex
CREATE INDEX "feed_posts_created_at_idx" ON "feed_posts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "feed_posts_status_idx" ON "feed_posts"("status");

-- CreateIndex
CREATE INDEX "feed_posts_post_type_idx" ON "feed_posts"("post_type");

-- CreateIndex
CREATE INDEX "feed_posts_status_created_at_idx" ON "feed_posts"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "feed_post_media_post_id_idx" ON "feed_post_media"("post_id");

-- CreateIndex
CREATE INDEX "feed_interactions_post_id_idx" ON "feed_interactions"("post_id");

-- CreateIndex
CREATE INDEX "feed_interactions_user_id_interaction_type_idx" ON "feed_interactions"("user_id", "interaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "feed_interactions_post_id_user_id_interaction_type_key" ON "feed_interactions"("post_id", "user_id", "interaction_type");

-- CreateIndex
CREATE INDEX "comments_post_id_idx" ON "comments"("post_id");

-- CreateIndex
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");

-- CreateIndex
CREATE INDEX "comments_created_at_idx" ON "comments"("created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_idx" ON "wallet_transactions"("wallet_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_created_at_idx" ON "wallet_transactions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_transactions_reference_type_reference_id_idx" ON "wallet_transactions"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_wallet_id_reference_type_reference_id_key" ON "wallet_transactions"("wallet_id", "reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "challenges_is_active_ends_at_idx" ON "challenges"("is_active", "ends_at");

-- CreateIndex
CREATE INDEX "challenges_challenge_type_idx" ON "challenges"("challenge_type");

-- CreateIndex
CREATE INDEX "challenge_progress_user_id_idx" ON "challenge_progress"("user_id");

-- CreateIndex
CREATE INDEX "challenge_progress_challenge_id_idx" ON "challenge_progress"("challenge_id");

-- CreateIndex
CREATE INDEX "challenge_progress_is_completed_idx" ON "challenge_progress"("is_completed");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_progress_challenge_id_user_id_key" ON "challenge_progress"("challenge_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_action_type_action_id_idx" ON "notifications"("action_type", "action_id");

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "reports_reported_entity_type_reported_entity_id_idx" ON "reports"("reported_entity_type", "reported_entity_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "trust_events_user_id_created_at_idx" ON "trust_events"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_media_id_fkey" FOREIGN KEY ("avatar_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_operational_info" ADD CONSTRAINT "vendor_operational_info_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_ownership" ADD CONSTRAINT "vendor_ownership_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_ownership" ADD CONSTRAINT "vendor_ownership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_tags" ADD CONSTRAINT "vendor_tags_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_tags" ADD CONSTRAINT "vendor_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_ratings" ADD CONSTRAINT "review_ratings_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_interactions" ADD CONSTRAINT "review_interactions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_interactions" ADD CONSTRAINT "review_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_evidence" ADD CONSTRAINT "visit_evidence_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followers" ADD CONSTRAINT "followers_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followers" ADD CONSTRAINT "followers_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_media" ADD CONSTRAINT "feed_post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_media" ADD CONSTRAINT "feed_post_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_interactions" ADD CONSTRAINT "feed_interactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_interactions" ADD CONSTRAINT "feed_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_events" ADD CONSTRAINT "trust_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

