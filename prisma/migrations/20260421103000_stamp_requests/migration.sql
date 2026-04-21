CREATE TYPE "StampRequestStatus" AS ENUM ('PENDING', 'APPROVED');

ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'STAFF_STAMP_REQUEST';

CREATE TABLE "StampRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "StampRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedByStaffUserId" TEXT,
    "loyaltyEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StampRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StampRequest_loyaltyEventId_key" ON "StampRequest"("loyaltyEventId");
CREATE INDEX "StampRequest_customerId_status_createdAt_idx" ON "StampRequest"("customerId", "status", "createdAt");
CREATE INDEX "StampRequest_status_createdAt_idx" ON "StampRequest"("status", "createdAt");
CREATE INDEX "StampRequest_resolvedByStaffUserId_idx" ON "StampRequest"("resolvedByStaffUserId");

ALTER TABLE "StampRequest" ADD CONSTRAINT "StampRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StampRequest" ADD CONSTRAINT "StampRequest_resolvedByStaffUserId_fkey" FOREIGN KEY ("resolvedByStaffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StampRequest" ADD CONSTRAINT "StampRequest_loyaltyEventId_fkey" FOREIGN KEY ("loyaltyEventId") REFERENCES "LoyaltyStampEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
