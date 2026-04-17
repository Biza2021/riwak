-- CreateIndex
CREATE INDEX "Order_customerId_status_expiresAt_idx" ON "public"."Order"("customerId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Order_status_expiresAt_idx" ON "public"."Order"("status", "expiresAt");
