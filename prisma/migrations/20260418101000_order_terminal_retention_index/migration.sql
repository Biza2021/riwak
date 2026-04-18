-- CreateIndex
CREATE INDEX "Order_status_updatedAt_idx" ON "public"."Order"("status", "updatedAt");
