-- CreateTable
CREATE TABLE "GeoFact" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'fact',
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeoFact_kind_order_idx" ON "GeoFact"("kind", "order");

-- CreateIndex
CREATE INDEX "GeoFact_status_idx" ON "GeoFact"("status");

-- CreateIndex
CREATE INDEX "GeoFact_locale_idx" ON "GeoFact"("locale");
