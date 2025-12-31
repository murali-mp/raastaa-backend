-- CreateEnum
CREATE TYPE "expedition_type" AS ENUM ('food_trail', 'cuisine_quest', 'night_crawl', 'budget_run', 'custom');

-- CreateEnum
CREATE TYPE "expedition_status" AS ENUM ('active', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "expeditions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "expedition_type" "expedition_type" NOT NULL,
    "notes" TEXT,
    "target_date" TIMESTAMPTZ(6),
    "status" "expedition_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "expeditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expedition_stops" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "expedition_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_visited" BOOLEAN NOT NULL DEFAULT false,
    "visited_at" TIMESTAMPTZ(6),

    CONSTRAINT "expedition_stops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expeditions_user_id_status_idx" ON "expeditions"("user_id", "status");

-- CreateIndex
CREATE INDEX "expeditions_created_at_idx" ON "expeditions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "expedition_stops_expedition_id_sort_order_idx" ON "expedition_stops"("expedition_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "expedition_stops_expedition_id_vendor_id_key" ON "expedition_stops"("expedition_id", "vendor_id");

-- AddForeignKey
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedition_stops" ADD CONSTRAINT "expedition_stops_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "expeditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedition_stops" ADD CONSTRAINT "expedition_stops_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
