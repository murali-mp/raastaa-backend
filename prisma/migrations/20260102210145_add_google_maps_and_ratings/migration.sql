-- AlterTable
ALTER TABLE "vendor_operational_info" ADD COLUMN     "google_maps_url" VARCHAR(1000);

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "average_rating" DECIMAL(3,2),
ADD COLUMN     "place_id" VARCHAR(255),
ADD COLUMN     "total_ratings" INTEGER;
