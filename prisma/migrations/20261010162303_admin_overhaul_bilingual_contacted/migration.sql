-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "nameZh" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "contacted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "descriptionZh" TEXT,
ADD COLUMN     "nameZh" TEXT;
