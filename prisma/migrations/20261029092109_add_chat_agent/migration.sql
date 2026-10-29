-- AlterTable
ALTER TABLE "ChatConversation" ALTER COLUMN "lastMessageAt" SET DEFAULT now(),
ALTER COLUMN "createdAt" SET DEFAULT now();

-- AlterTable
ALTER TABLE "ChatMessage" ALTER COLUMN "createdAt" SET DEFAULT now();

-- CreateTable
CREATE TABLE "ChatAgent" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "ChatAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReadCursor" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "lastReadSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "ChatReadCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatAgent_username_key" ON "ChatAgent"("username");

-- CreateIndex
CREATE INDEX "ChatAgent_active_idx" ON "ChatAgent"("active");

-- CreateIndex
CREATE INDEX "ChatReadCursor_staffId_idx" ON "ChatReadCursor"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatReadCursor_conversationId_staffId_key" ON "ChatReadCursor"("conversationId", "staffId");

-- AddForeignKey
ALTER TABLE "ChatReadCursor" ADD CONSTRAINT "ChatReadCursor_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
