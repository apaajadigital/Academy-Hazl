import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../db/prisma.js";
import { validateCoupon, incrementCouponUsage } from "../services/coupon/couponService.js";
import { createDokuOrder } from "../services/payment/dokuService.js";
import { buildInvoiceNumber } from "../services/payment/invoiceNumber.js";
import { isEventEnded } from "../services/event/eventService.js";
import { enqueueEmail } from "../jobs/queues.js";
import { successResponse, errorResponse, AppError } from "../types/index.js";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";
import { z } from "zod";

const router = Router();

/**
 * Checkout has no cart: every order gets exactly one line of one copy. The
 * EBook.totalSold increment on the free-fulfillment path reads this SAME
 * constant as the OrderItem it is counting, so the sales counter cannot drift
 * from the line quantity if multi-copy purchase ever lands here.
 */
const CHECKOUT_LINE_QUANTITY = 1;

const checkoutSchema = z.object({
  itemType: z.enum(["course", "ebook", "event"]),
  itemId: z.string().min(1),
  couponCode: z.string().optional(),
  referralCode: z.string().optional(),
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    const body = checkoutSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));
    }
    const { itemType, itemId, couponCode, referralCode } = body.data;
    const userId = req.user!.id;

    // Get item details
    let itemTitle = "";
    let price = 0;
    /** Slug of the purchased item — used to build the failure redirect URL */
    let itemSlug = "";
    /**
     * BL-63: event schedule/venue kept from the lookup above so the e-ticket email
     * can be built on the 100%-off-coupon path without a second Event query.
     * Stays null for non-event items.
     */
    let eventDetail: { startDate: Date; location: string | null; venue: string | null; type: string } | null = null;

    if (itemType === "course") {
      const course = await prisma.course.findUnique({ where: { id: itemId } });
      if (!course) throw new AppError(404, "Kursus tidak ditemukan.");

      const alreadyEnrolled = await prisma.courseEnrollment.findUnique({
        where: { courseId_userId: { courseId: itemId, userId } },
      });
      if (alreadyEnrolled) throw new AppError(400, "Anda sudah terdaftar di kursus ini.");

      itemTitle = course.title;
      // BL-53: courses were the only item type billed at full `price`, ignoring
      // `salePrice` — so every discounted course charged the undiscounted amount
      // while the catalog advertised the sale. Same precedence as ebook (below):
      // an explicit salePrice wins, only null falls back to price.
      //
      // `??` and not a truthiness ternary: `salePrice = 0` is a legitimate value
      // (a course discounted to free) and a ternary treats it as "unset", billing
      // the full price — the exact shape of the original bug. Prisma hands back a
      // Decimal object, which is truthy even at zero, so the ternary happened to
      // work against a live DB and only broke once the value crossed a boundary
      // that turned it into a plain number. `??` is correct for both.
      price = Number(course.salePrice ?? course.price);
      itemSlug = course.slug;
    } else if (itemType === "ebook") {
      const ebook = await prisma.eBook.findUnique({ where: { id: itemId } });
      if (!ebook || ebook.status !== "published") throw new AppError(404, "E-Book tidak ditemukan.");
      itemTitle = ebook.title;
      price = ebook.salePrice ? Number(ebook.salePrice) : Number(ebook.price);
      itemSlug = ebook.slug;
    } else {
      const event = await prisma.event.findUnique({ where: { id: itemId } });
      if (!event || event.status !== "published") throw new AppError(404, "Event tidak ditemukan.");

      const alreadyRegistered = await prisma.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: itemId, userId } },
      });
      if (alreadyRegistered) throw new AppError(400, "Anda sudah terdaftar di event ini.");

      // Server-side expiry guard. The listing hides finished events and the UI
      // disables the button, but neither is a control: a POST straight to this
      // endpoint bypasses both. On 10 Aug 2026 two finished events were still
      // sellable here for Rp 350.000 and Rp 150.000.
      //
      // 422 rather than 400: the request is well-formed, the resource simply
      // cannot be bought any more. `EVENT_ENDED` is a stable code the client
      // can branch on without string-matching the message.
      if (isEventEnded(event)) {
        throw new AppError(422, "Event ini sudah selesai dan tidak menerima pendaftaran baru.", "EVENT_ENDED");
      }

      if (event.quota && event.totalSold >= event.quota) {
        throw new AppError(400, "Kapasitas event sudah penuh.");
      }

      itemTitle = event.title;
      price = event.salePrice ? Number(event.salePrice) : Number(event.price);
      itemSlug = event.slug;
      eventDetail = {
        startDate: event.startDate,
        location: event.location,
        venue: event.venue,
        type: event.type,
      };

      if (price === 0) {
        // Free event — register immediately, skip payment.
        // Batch8 (free-event quota): reserve the slot ATOMICALLY so concurrent
        // registrations cannot exceed the quota. quota=null means unlimited.
        const reserved = await prisma.event.updateMany({
          where: { id: itemId, OR: [{ quota: null }, { totalSold: { lt: event.quota ?? 0 } }] },
          data: { totalSold: { increment: 1 } },
        });
        if (reserved.count === 0) throw new AppError(409, "Kuota event sudah penuh.");
        const registration = await prisma.eventRegistration.create({
          data: { eventId: itemId, userId, status: "confirmed" },
          // Pull the buyer's display name in the same round-trip — req.user only
          // carries id/email/roles, and the e-ticket email is addressed by name.
          include: { user: { select: { name: true, email: true } } },
        });
        // BL-63: confirmation + e-ticket. Fire-and-forget — a notification failure
        // must never undo a registration that already reserved a seat.
        enqueueEmail({
          type: "event-registration-confirmed",
          to: registration.user?.email ?? req.user!.email,
          name: registration.user?.name ?? "Peserta",
          eventTitle: event.title,
          ticketCode: registration.ticketCode,
          startDate: event.startDate,
          location: event.location,
          venue: event.venue,
          eventType: event.type,
        }).catch(() => {});
        // pendingUrl is null, not absent: free items are fulfilled inline so there
        // is nothing to settle, but the response shape stays uniform (BL-56).
        return res.json(
          successResponse({ orderId: null, paymentUrl: null, pendingUrl: null, finalAmount: 0, free: true })
        );
      }
    }

    // Apply coupon
    let couponId: string | undefined;
    let discountAmount = 0;
    let finalAmount = price;

    if (couponCode) {
      const validation = await validateCoupon(couponCode, price);
      couponId = validation.couponId;
      discountAmount = validation.discountAmount;
      finalAmount = validation.finalAmount;
    }

    // Create order
    // Validate referral code
    let resolvedReferralCode: string | undefined;
    if (referralCode) {
      const affiliate = await prisma.affiliate.findFirst({
        where: { code: referralCode, status: "active" },
      });
      if (affiliate && affiliate.userId !== userId) {
        resolvedReferralCode = referralCode;
        await prisma.affiliate.update({
          where: { id: affiliate.id },
          data: { totalClicks: { increment: 1 } },
        });
      }
    }

    // If the final payment amount is Rp 0 (natively free or coupon discounted 100%), fulfill immediately!
    if (finalAmount === 0) {
      const order = await prisma.order.create({
        data: {
          userId,
          totalAmount: price,
          discountAmount,
          finalAmount: 0,
          status: "paid",
          paidAt: new Date(),
          paymentMethod: "free",
          couponId: couponId ?? null,
          referralCode: resolvedReferralCode ?? null,
          items: {
            create: {
              itemType,
              itemId,
              itemTitle,
              quantity: CHECKOUT_LINE_QUANTITY,
              unitPrice: price,
              totalPrice: price,
            },
          },
        },
        include: { user: { select: { name: true, email: true } } },
      });

      // BL-143(b): guarded like the paid path in jobs/processors/webhook.ts, and
      // for the same reason — validateCoupon ran before this line and cannot
      // bind under concurrency. The order above is already created as `paid` and
      // fulfilled, so a lost guard must not fail the request; it means the slot
      // went to someone else between validation and here.
      if (couponId && !(await incrementCouponUsage(couponId))) {
        logger.error("coupon usage limit exceeded on free checkout — order fulfilled anyway", {
          couponId,
          orderId: order.id,
        });
      }

      await prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          gateway: "free",
          // BL-140/BL-148: the free path had the same 8-hex truncation as the
          // paid one, so two free orders could share an identity too.
          gatewayTxId: buildInvoiceNumber(order.id, "free"),
          amount: 0,
          status: "success",
        },
      });

      if (itemType === "course") {
        await prisma.courseEnrollment.upsert({
          where: { courseId_userId: { courseId: itemId, userId } },
          create: { courseId: itemId, userId },
          update: {},
        });
      } else if (itemType === "ebook") {
        // BL-97: EBook.totalSold was declared but never written, so every ebook
        // reported 0 sales forever and the admin/report figures built on it were
        // pure fiction. Count the sale here, on the SAME path that grants access
        // (the paid order created above is what routes/ebooks.ts checks). No
        // quota guard: unlike events an ebook has unlimited stock, so a plain
        // increment is correct and nothing can oversell.
        //
        // The counter is gross and increment-only — a refund deliberately does
        // not release it (routes/orders.ts explains why no correct release
        // exists). Increment by the order line's quantity constant rather than a
        // literal so the two can never disagree.
        //
        // updateMany, not update: a deleted/renamed ebook would make `update`
        // throw P2025 AFTER the order + payment transaction were already
        // committed, 500-ing a checkout the buyer has already been granted.
        // updateMany matches 0 rows instead and leaves the purchase intact.
        await prisma.eBook.updateMany({
          where: { id: itemId },
          data: { totalSold: { increment: CHECKOUT_LINE_QUANTITY } },
        });
      } else if (itemType === "event") {
        // Batch8: a 100%-off coupon fulfills a paid event inline here. Reserve
        // the slot ATOMICALLY (same guard as the price===0 path / webhook) so a
        // coupon-free event cannot oversell. quota=null means unlimited.
        const ev = await prisma.event.findUnique({ where: { id: itemId }, select: { quota: true } });
        const reserved = await prisma.event.updateMany({
          where: { id: itemId, OR: [{ quota: null }, { totalSold: { lt: ev?.quota ?? 0 } }] },
          data: { totalSold: { increment: 1 } },
        });
        if (reserved.count === 0) throw new AppError(409, "Kuota event sudah penuh.");
        const registration = await prisma.eventRegistration.upsert({
          where: { eventId_userId: { eventId: itemId, userId } },
          create: { eventId: itemId, userId, orderId: order.id, status: "confirmed" },
          update: { status: "confirmed", orderId: order.id },
        });
        // BL-63: same e-ticket as the free path — a 100%-off coupon still produces
        // a real confirmed seat. Fire-and-forget: never fail a paid-out checkout.
        enqueueEmail({
          type: "event-registration-confirmed",
          to: order.user.email,
          name: order.user.name,
          eventTitle: itemTitle,
          ticketCode: registration.ticketCode,
          startDate: eventDetail?.startDate,
          location: eventDetail?.location,
          venue: eventDetail?.venue,
          eventType: eventDetail?.type,
          orderId: order.id,
        }).catch(() => {});
      }

      // No payment email for free items — the user is redirected directly to the
      // product page on success. (Events are the exception: BL-63 sends the
      // e-ticket from the event branch above, since the ticket code is the only
      // way in at check-in.)

      return res.json(
        successResponse({ orderId: order.id, paymentUrl: null, pendingUrl: null, finalAmount: 0, free: true })
      );
    }

    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount: price,
        discountAmount,
        finalAmount,
        status: "pending",
        couponId: couponId ?? null,
        referralCode: resolvedReferralCode ?? null,
        expiredAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        items: {
          create: {
            itemType,
            itemId,
            itemTitle,
            quantity: CHECKOUT_LINE_QUANTITY,
            unitPrice: price,
            totalPrice: price,
          },
        },
      },
      include: { user: { select: { name: true, email: true } } },
    });

    // M-coupon: coupon usage is now incremented on payment SUCCESS in the webhook
    // processor (order.couponId), so an abandoned/failed pending order no longer
    // consumes a coupon slot. Free orders (fulfilled above) still count inline.

    // Create DOKU payment.
    //
    // BL-140/BL-148: this used to be `JA-${order.id.slice(0, 8)}` — 32 bits of a
    // UUID behind a hyphen DOKU rejects for KKI. The identifier now encodes the
    // WHOLE order id, so two orders cannot collide, and carries no symbols.
    const invoiceNumber = buildInvoiceNumber(order.id, "paid");
    const callbackUrl = `${env.WEB_URL}/payment/success?orderId=${order.id}`;

    // Build a failure URL so DOKU can redirect the user back to the checkout
    // page (with context) when payment is cancelled or fails.
    let failureUrl: string | undefined;
    if (itemSlug) {
      const returnPath =
        itemType === "event"
          ? `/checkout/${itemSlug}?type=event&itemId=${itemId}`
          : `/checkout/${itemSlug}`;
      failureUrl = `${env.WEB_URL}/payment/failed?orderId=${order.id}&returnUrl=${encodeURIComponent(returnPath)}`;
    }

    // BL-56: async payment methods (VA / bank transfer) are not settled when the
    // buyer leaves DOKU, so they must land on the pending page that shows the
    // transfer instructions and expiry countdown. Unlike failureUrl this is never
    // conditional — every paid order can be settled asynchronously.
    const pendingUrl = `${env.WEB_URL}/payment/pending?orderId=${order.id}`;

    const { paymentUrl } = await createDokuOrder(
      invoiceNumber,
      [{ name: itemTitle, price: Math.round(finalAmount), quantity: 1 }],
      Math.round(finalAmount),
      callbackUrl,
      order.user.name,
      order.user.email,
      failureUrl,
      pendingUrl
    );

    // Store transaction record
    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        gateway: "doku",
        gatewayTxId: invoiceNumber,
        amount: finalAmount,
        status: "pending",
      },
    });

    // Non-blocking notification (queued in prod, inline in dev/test).
    // Fire-and-forget: never block the checkout response on email delivery.
    enqueueEmail({
      type: "payment-pending",
      to: order.user.email,
      name: order.user.name,
      orderId: order.id,
      amount: finalAmount,
      paymentUrl,
    }).catch(() => {});

    return res.json(successResponse({ orderId: order.id, paymentUrl, pendingUrl, finalAmount }));
  } catch (err) {
    next(err);
  }
});

export default router;
