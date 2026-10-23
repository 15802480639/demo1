-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pointsDiscount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsSettled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pointsUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "options" TEXT,
ADD COLUMN     "paidAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skuLabel" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "earnPoints" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "earnType" TEXT NOT NULL DEFAULT 'percent',
ADD COLUMN     "earnValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxPointUse" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usePoints" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" TEXT,
    "remark" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointRule" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "earnPercent" INTEGER NOT NULL DEFAULT 5,
    "minSpendForUse" INTEGER NOT NULL DEFAULT 50000,
    "pointsPerKrw" INTEGER NOT NULL DEFAULT 100,
    "maxUsePercent" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointTransaction_userId_createdAt_idx" ON "PointTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_orderId_idx" ON "PointTransaction"("orderId");

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
