-- OrderItem (itemType, itemId) lookup index (BL-98 — unindexed ownership checks).
-- Ebook ownership is resolved entirely through "order_items" filtered on
-- itemType + itemId: routes/ebooks.ts GET /my (the user's library) and
-- GET /:slug/file (the download gate), plus the admin delete guard in
-- modules/admin/ebooks.ts. "order_items" only had an index on orderId, so each of
-- those filters degraded to a sequential scan over every order line on the
-- platform and gets slower with every sale made.
-- NOTE: not yet applied (no DB available in this environment). Apply with
-- `prisma migrate deploy` only after a human reviewer approves (SSOT §9.6).

-- CreateIndex
CREATE INDEX "order_items_itemType_itemId_idx" ON "order_items"("itemType", "itemId");
