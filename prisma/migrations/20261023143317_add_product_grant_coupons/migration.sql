-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "grantCouponIds" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "UserCoupon" ADD COLUMN     "grantedByOrder" TEXT;
