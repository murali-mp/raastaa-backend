-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "transaction_reason" ADD VALUE 'like_bonus';
ALTER TYPE "transaction_reason" ADD VALUE 'comment_bonus';
ALTER TYPE "transaction_reason" ADD VALUE 'post_bonus';
ALTER TYPE "transaction_reason" ADD VALUE 'follow_bonus';
