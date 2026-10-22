-- CreateTable
CREATE TABLE "EventItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "subtitle" TEXT,
    "subtitleZh" TEXT,
    "badge" TEXT,
    "imageUrl" TEXT,
    "href" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventItem_status_order_idx" ON "EventItem"("status", "order");
