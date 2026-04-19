-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM (
  'STAFF_NEW_ORDER',
  'CUSTOMER_ORDER_READY',
  'CUSTOMER_REWARD_EARNED'
);

-- CreateTable
CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_updatedAt_idx" ON "PushSubscription"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_subscriptionId_eventKey_key" ON "NotificationDelivery"("subscriptionId", "eventKey");

-- CreateIndex
CREATE INDEX "NotificationDelivery_eventKey_idx" ON "NotificationDelivery"("eventKey");

-- AddForeignKey
ALTER TABLE "PushSubscription"
ADD CONSTRAINT "PushSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery"
ADD CONSTRAINT "NotificationDelivery_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "PushSubscription"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
