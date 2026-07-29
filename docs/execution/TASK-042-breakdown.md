# TASK-042 Breakdown — Marketplace Materi (unit-6)

> Written per SSOT §9.3 before executing. TASK-042 is **Effort XL** and the SSOT work order marks it `042*` = "pecah dulu jadi subtask" (§1163). This document is the mandatory split. **No code is produced here** — execution is post-Soft-Launch, one sub-PR at a time, reviewer-gated, behind flags.
>
> Governs by: `docs/adr/0002-phase6-architecture.md`. Context: `docs/PHASE6_MASTER_PLAN.md` §11.

## Verified current state (better than a from-scratch build)

| Aspect | State |
|--------|-------|
| Marketplace page | `apps/web/app/(public)/marketplace/page.tsx` — **live, bukan placeholder** (bukan `<ComingSoon>`, tidak ter-gate flag). Menarik data nyata dari `GET /api/ebooks` dan menjual e-book asli; kartu produk menaut ke `/ebook/{slug}`. **Facade di atas domain E-Book**, bukan unit bisnis mandiri. Flag `features.marketplace` sudah dihapus (29 Jul 2026) karena tak pernah dibaca kode mana pun (dead flag). |
| Nav/footer links | Already point at `/marketplace` (`Navbar.tsx:41-42`, `Footer.tsx:14`), plus homepage `CategoryGrid` & `sitemap.ts` |
| Commerce core | ✅ **Strong.** `Order`, `OrderItem` (polymorphic `itemType`/`itemId`), `PaymentTransaction`, `Coupon`, `Refund`, `AffiliateCommission`, `TrainerPayout` all exist |
| Checkout | ✅ `routes/checkout.ts` creates Order+OrderItem, validates coupon, calls DOKU — but `itemType` hardcoded `["course","ebook","event"]` |
| Payment gateway | ✅ `services/payment/dokuService.ts` (HMAC-SHA256, constant-time webhook verify) |
| Fulfillment | ✅ `routes/webhooks.ts` → job queue (`jobs/queues.ts`) |
| Payout | ✅ `TrainerPayout` model exists (schema:681) — reuse for seller payout |
| **Cart** | ❌ None — single-item checkout only |
| **Signed upload (R2)** | ❌ **TASK-098 not built** (BL-32) — blocks creator upload; needs Cloudflare creds (human-gated) |
| Product/Seller models | ❌ None — greenfield |

**Implication:** Marketplace is ~60% infrastructure-reuse. The genuinely new work is: product/seller domain models, a multi-line cart, a new `itemType`, seller/admin dashboards, moderation, and R2 signed upload (blocked on TASK-098).

## Hard dependency: TASK-098 (Cloudflare R2 + Stream)

Creator file upload (`042c`) **cannot ship** until R2 is verified. Sequencing choice: build `042a/b/d` (schema, API, buyer UI for existing-content resale) first so Marketplace can launch with trainer-uploaded-elsewhere assets or link-based products, then add native R2 upload in `042c` once TASK-098 lands. This keeps the epic unblocked.

## Data model (new — TASK-042a)

```prisma
model MarketplaceProduct {
  id          String  @id @default(uuid())
  sellerId    String  // User/Trainer id
  slug        String  @unique
  title       String
  description String? @db.Text
  categoryId  String?
  price       Decimal @db.Decimal(12,2)
  type        String  // digital_file | recording | bundle | external_link
  fileKey     String? // R2 object key (TASK-098); null for external_link
  previewUrl  String?
  status      String  @default("draft") // draft | pending_review | published | rejected | suspended
  moderatedBy String?
  moderatedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  seller      User     @relation(fields: [sellerId], references: [id])
  category    MarketplaceCategory? @relation(fields: [categoryId], references: [id])
  reviews     MarketplaceReview[]
  @@index([status, createdAt])
  @@index([sellerId, status])
  @@map("marketplace_products")
}
model MarketplaceCategory {
  id       String @id @default(uuid())
  slug     String @unique
  name     String
  products MarketplaceProduct[]
  @@map("marketplace_categories")
}
model MarketplaceReview {
  id        String  @id @default(uuid())
  productId String
  userId    String  // must have purchased (verified)
  rating    Int
  comment   String? @db.Text
  status    String  @default("visible") // visible | hidden
  createdAt DateTime @default(now())
  product   MarketplaceProduct @relation(fields: [productId], references: [id])
  @@unique([productId, userId])
  @@index([productId, status])
  @@map("marketplace_reviews")
}
model Wishlist {
  id        String @id @default(uuid())
  userId    String
  productId String
  createdAt DateTime @default(now())
  @@unique([userId, productId])
  @@map("wishlists")
}
model Cart {
  id        String @id @default(uuid())
  userId    String @unique
  updatedAt DateTime @updatedAt
  items     CartItem[]
  @@map("carts")
}
model CartItem {
  id        String @id @default(uuid())
  cartId    String
  productId String
  addedAt   DateTime @default(now())
  cart      Cart @relation(fields: [cartId], references: [id], onDelete: Cascade)
  @@unique([cartId, productId])
  @@map("cart_items")
}
model SellerPayoutAccount {
  id        String @id @default(uuid())
  sellerId  String @unique
  method    String // bank | ewallet
  accountRef String // stored ref, not raw PAN
  revenueSharePct Decimal @db.Decimal(5,2) @default(70.00) // seller take; platform keeps remainder
  createdAt DateTime @default(now())
  @@map("seller_payout_accounts")
}
```
Digital entitlement after purchase reuses the existing fulfillment pattern (a purchased `marketplace_item` grants download access, mirroring course enrollment). Seller earnings recorded via existing `TrainerPayout` on fulfillment.

## Subtasks

1. **`042a` — Schema + migration + moderation states.** All models above; hand-written migration (no local Postgres — `migrate deploy` host-gated). Seed a few marketplace categories. Adds `MarketplaceProduct.status` state machine. *Blast radius: DB only. Non-breaking.*
2. **`042b` — Core API (`modules/marketplace/`) + `itemType` extension.** Catalog (`GET /api/marketplace/products` with search/category/filter/sort + pagination), product detail, seller CRUD (own products), wishlist, purchased-user reviews. Extend `OrderItem.itemType` with `marketplace_item` + fulfillment handler in `webhooks.ts` (F4). Multi-line **cart** API. Reuse `successResponse`/Zod/`authenticate`. *Split into sub-routers to stay < 400 lines.*
3. **`042c` — R2 signed upload (BLOCKED on TASK-098).** Presigned PUT for creator files, `fileKey` wiring, signed GET for entitled buyers, virus/type/size guard. Ships only after R2 verified; until then products are `external_link` type.
4. **`042d` — Buyer UI.** Replace `ComingSoon`: catalog grid + filters, product detail, cart, checkout (reuse existing checkout flow), library/downloads, reviews. Editorial design system + honest empty states. **Catatan 29 Jul 2026:** flag `features.marketplace` sudah DIHAPUS (dead flag — nol call site sementara halamannya tayang penuh). Bila 042d butuh gating, deklarasikan ulang flag-nya **bersamaan** dengan call site-nya, jangan mengandalkan yang lama.
5. **`042e` — Seller dashboard + payout.** Seller onboarding (`SellerPayoutAccount`), product management, sales/earnings view, revenue-share calc → `TrainerPayout`. Payout execution is human-gated (money).
6. **`042f` — Admin moderation.** Review queue (`pending_review` → publish/reject/suspend), report handling, category management, take-down. Audit-logged (`writeAudit`).

## Sequencing & estimate

```
042a schema ─► 042b API+cart+itemType ─► 042d Buyer UI ─┐
                                     └─► 042e Seller+payout ─► 042f Moderation
042c R2 upload ── (parallel, gated on TASK-098) ──────────┘
```
- **Effort:** 042a S · 042b L · 042c M (blocked) · 042d L · 042e M · 042f M → **XL total**, ~6 sub-PRs.
- **Money-touching (042b checkout, 042e payout):** ≥80% coverage, DOKU sandbox verification, no real-money execution without reviewer (DEFERRED per CLAUDE.md).

## Risks

| Risk | Mitigation |
|------|-----------|
| R2 not verified (BL-32) blocks upload | Ship `external_link`/existing-asset products first; add native upload in 042c post-098 |
| Revenue-share / payout money bugs | Reuse `TrainerPayout`; sandbox-only; human-gated execution; ≥80% coverage |
| Moderation bypass (unsafe content live) | Products default `draft`→`pending_review`; nothing `published` without admin action; report + suspend path |
| Marketplace review fraud (unpurchased reviews) | `MarketplaceReview` requires verified purchase (unique per product+user, checked against fulfilled Order) |
| Oversized route files | `modules/marketplace/` sub-routers (catalog / product / cart / seller / admin), each < 400 lines |
| XSS via product description/review | Render as text or sanitized markdown; never raw HTML |

## Recommendation

Execute **042a → 042b → 042d** first (a functional marketplace over existing/linked assets, monetized through the proven checkout), defer **042c** until TASK-098 R2 is verified, then **042e/042f**. This unblocks a launchable Marketplace without waiting on Cloudflare credentials, and keeps every sub-PR small, flag-gated, and reversible (§0.3). All post-Soft-Launch.
