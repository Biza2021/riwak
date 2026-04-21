CREATE TABLE "CustomerAccessLink" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByStaffUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAccessLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerAccessLink_tokenHash_key" ON "CustomerAccessLink"("tokenHash");
CREATE INDEX "CustomerAccessLink_customerId_expiresAt_idx" ON "CustomerAccessLink"("customerId", "expiresAt");
CREATE INDEX "CustomerAccessLink_expiresAt_idx" ON "CustomerAccessLink"("expiresAt");
CREATE INDEX "CustomerAccessLink_createdByStaffUserId_idx" ON "CustomerAccessLink"("createdByStaffUserId");

ALTER TABLE "CustomerAccessLink" ADD CONSTRAINT "CustomerAccessLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAccessLink" ADD CONSTRAINT "CustomerAccessLink_createdByStaffUserId_fkey" FOREIGN KEY ("createdByStaffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
