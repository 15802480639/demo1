-- AlterTable
ALTER TABLE "User" ADD COLUMN     "staffRole" TEXT NOT NULL DEFAULT 'owner';

-- AlterTable
ALTER TABLE "ChatConversation" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "ChatAgent" ADD COLUMN     "permissions" TEXT NOT NULL DEFAULT 'support_basic';

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL DEFAULT '',
    "actorRole" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'order',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "orderId" TEXT,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotificationRead" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");

-- CreateIndex
CREATE INDEX "AdminNotificationRead_userId_idx" ON "AdminNotificationRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminNotificationRead_notificationId_userId_key" ON "AdminNotificationRead"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotificationRead" ADD CONSTRAINT "AdminNotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "AdminNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

