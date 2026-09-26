import { Prisma, type TrainerPayout } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../types/index.js";

/**
 * Platform revenue split: the share of gross course revenue that belongs to the
 * trainer. This lived as a bare `0.7` in three separate spots in
 * routes/trainer.ts (dashboard, per-course analytics, payout balance), so a
 * policy change could silently drift between what a trainer is shown and what
 * they are allowed to withdraw. One named constant, one place to change it.
 */
export const TRAINER_REVENUE_SHARE = 0.7;

/**
 * F3 (float money): the same share as an exact decimal. `Number * 0.7` on an
 * IEEE-754 double is not the value it prints — `8_150_000 * 0.7` evaluates to
 * `5_704_999.999999999`, and for other gross values it lands a few micro-rupiah
 * ABOVE the true share. Since the payout guard is a strict `>`, that excess was
 * withdrawable. All balance arithmetic therefore runs on Prisma.Decimal (the
 * same type the `Decimal(12,2)` columns already use) and is rounded explicitly.
 *
 * Derived from the constant above (via its decimal string, so the double is
 * never re-interpreted) rather than written out a second time — two literals
 * would be two places to forget when the split changes.
 */
const TRAINER_REVENUE_SHARE_DECIMAL = new Prisma.Decimal(TRAINER_REVENUE_SHARE.toString());

/** Money is stored as `Decimal(12,2)`; every derived amount is rounded to match. */
const MONEY_DP = 2;

/**
 * Rounding direction for the trainer's share. ROUND_DOWN (truncate) on purpose:
 * a half-up rounding of the revenue share would hand the trainer a fraction of a
 * rupiah they never earned, and that fraction is withdrawable. Truncation can
 * only ever leave money on the platform side, which is the safe direction.
 */
const MONEY_ROUNDING = Prisma.Decimal.ROUND_DOWN;

/** Largest value a `Decimal(12,2)` column can hold (10 integer + 2 fraction digits). */
export const MAX_PAYOUT_AMOUNT = 9_999_999_999.99;

/**
 * Smallest payout a trainer may request (owner decision, 29 Jul 2026).
 *
 * A floor is a business rule, not a technical one: every payout costs a manual
 * review and a bank transfer fee, so tiny withdrawals cost more to process than
 * they move. Exported so the API boundary and any future admin tooling read the
 * same number instead of each hardcoding its own.
 */
export const MIN_PAYOUT_AMOUNT = 10_000;

/** Payout statuses an admin may transition a pending payout into. */
export type TrainerPayoutDecision = "approved" | "rejected" | "paid";

export type TrainerBalance = {
  /** Gross value of paid course line items for the trainer's courses. */
  grossRevenue: number;
  /** Gross value of those line items that belong to an approved refund. */
  refundedRevenue: number;
  /** (gross - refunded) * TRAINER_REVENUE_SHARE. */
  netRevenue: number;
  /** Payouts already requested or paid (everything except rejected ones). */
  committedPayouts: number;
  /** What the trainer may still withdraw right now. */
  availableBalance: number;
};

/** Same shape as {@link TrainerBalance} before it is narrowed to JSON numbers. */
type TrainerBalanceDecimal = { [K in keyof TrainerBalance]: Prisma.Decimal };

/**
 * Any Prisma client the balance queries can run on — the global client or the
 * `tx` handed out by `$transaction`. Required by F1: the balance must be read
 * inside the very transaction that creates the payout.
 */
export type PayoutPrismaClient = Prisma.TransactionClient;

/** Which trainer's (or which single course's) refunded revenue to sum. */
type RefundScope = { trainerId: string } | { courseId: string };

/**
 * Gross value of course line items that are still counted as paid but sit on an
 * approved refund.
 *
 * Refund handling (M-trainer): approving a refund normally flips the order to
 * status "refunded" (routes/orders.ts PATCH /admin/refunds/:refundId), which
 * already drops it out of the `status: "paid"` revenue aggregate. But the refund
 * row is marked "approved" OUTSIDE the transaction that flips the order, so a
 * failure in between leaves an approved refund on a still-"paid" order — money
 * the trainer no longer earned yet could still withdraw. Subtracting those line
 * items closes the window without double-counting orders that were flipped
 * correctly.
 *
 * F2 (unbounded query): this used to be `refund.findMany({ status: "approved" })`
 * over the WHOLE platform followed by `orderId: { in: [...every id...] }`. At a
 * few tens of thousands of refunds that IN-list blows past Postgres' bind
 * parameter limit and every payout request 500s — and it read other trainers'
 * refunds to compute one trainer's balance. `Refund` has no Prisma relation to
 * `Order` (schema.prisma: `orderId` is a plain unique column) so the join cannot
 * be expressed in the query builder; a single parameterised raw aggregate does
 * it in one round trip, touching only rows that belong to this trainer and
 * sending exactly one bind parameter regardless of platform size.
 */
async function sumRefundedCourseRevenue(
  client: PayoutPrismaClient,
  scope: RefundScope,
): Promise<Prisma.Decimal> {
  const courseFilter =
    "trainerId" in scope
      ? Prisma.sql`c."trainerId" = ${scope.trainerId}`
      : Prisma.sql`c."id" = ${scope.courseId}`;

  const rows = await client.$queryRaw<Array<{ refunded: string | null }>>(Prisma.sql`
    SELECT COALESCE(SUM(oi."totalPrice"), 0)::text AS refunded
    FROM "order_items" oi
    JOIN "courses" c ON c."id" = oi."itemId"
    JOIN "orders" o ON o."id" = oi."orderId"
    JOIN "refunds" r ON r."orderId" = o."id"
    WHERE oi."itemType" = 'course'
      AND o."status" = 'paid'
      AND r."status" = 'approved'
      AND ${courseFilter}
  `);

  // `::text` rather than a numeric bind: node-postgres would hand a `numeric`
  // back as a JS number and reintroduce the float rounding F3 removes.
  return new Prisma.Decimal(rows[0]?.refunded ?? 0);
}

/** The trainer's share of a gross amount, exact and rounded to 2 decimals. */
export function trainerShareOf(gross: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(gross)
    .times(TRAINER_REVENUE_SHARE_DECIMAL)
    .toDecimalPlaces(MONEY_DP, MONEY_ROUNDING);
}

/**
 * Net (refund-adjusted) trainer revenue for a single course.
 *
 * F4 (formula drift): the per-course analytics card used to show
 * `gross * 0.7` while the withdrawable balance subtracted approved refunds, so a
 * refunded course kept advertising revenue the trainer could never withdraw.
 * Payouts are trainer-wide and cannot be attributed to one course, so the course
 * view stops at "net after refunds" — the withdrawable figure lives on the
 * dashboard, which is the only place that can compute it.
 */
export async function computeCourseNetRevenue(
  courseId: string,
  grossRevenue: Prisma.Decimal | number,
  client: PayoutPrismaClient = prisma,
): Promise<{ grossRevenue: number; refundedRevenue: number; netRevenue: number }> {
  const gross = new Prisma.Decimal(grossRevenue);
  const refunded = await sumRefundedCourseRevenue(client, { courseId });
  // Floor at zero: inconsistent data must never produce a negative figure that
  // silently inflates a later calculation.
  const net = trainerShareOf(Prisma.Decimal.max(0, gross.minus(refunded)));

  return {
    grossRevenue: gross.toNumber(),
    refundedRevenue: refunded.toNumber(),
    netRevenue: net.toNumber(),
  };
}

async function computeBalanceDecimal(
  trainerId: string,
  client: PayoutPrismaClient,
): Promise<TrainerBalanceDecimal> {
  const courses = await client.course.findMany({
    where: { trainerId },
    select: { id: true },
  });
  const courseIds = courses.map((c) => c.id);

  const [revenueAgg, payoutAgg, refundedRevenue] = await Promise.all([
    client.orderItem.aggregate({
      _sum: { totalPrice: true },
      where: { itemType: "course", itemId: { in: courseIds }, order: { status: "paid" } },
    }),
    client.trainerPayout.aggregate({
      _sum: { amount: true },
      where: { trainerId, status: { not: "rejected" } },
    }),
    sumRefundedCourseRevenue(client, { trainerId }),
  ]);

  const grossRevenue = new Prisma.Decimal(revenueAgg._sum.totalPrice ?? 0);
  // Floor at zero: inconsistent data must never produce a negative balance that
  // silently inflates a later calculation.
  const netRevenue = trainerShareOf(Prisma.Decimal.max(0, grossRevenue.minus(refundedRevenue)));
  const committedPayouts = new Prisma.Decimal(payoutAgg._sum.amount ?? 0).toDecimalPlaces(MONEY_DP);
  // Also floored: an over-committed trainer has nothing to withdraw, and a
  // negative figure would be rendered as a negative rupiah amount in the UI.
  const availableBalance = Prisma.Decimal.max(0, netRevenue.minus(committedPayouts));

  return { grossRevenue, refundedRevenue, netRevenue, committedPayouts, availableBalance };
}

/**
 * Compute what a trainer may withdraw.
 *
 * Pass `client` to run inside an open transaction (see {@link requestTrainerPayout});
 * it defaults to the global client for read-only callers such as the dashboard.
 */
export async function computeTrainerAvailableBalance(
  trainerId: string,
  client: PayoutPrismaClient = prisma,
): Promise<TrainerBalance> {
  const balance = await computeBalanceDecimal(trainerId, client);
  // Narrow to numbers at the service boundary so the JSON response shape is
  // exactly what it was before F3 (Decimal would serialise as a string).
  return {
    grossRevenue: balance.grossRevenue.toNumber(),
    refundedRevenue: balance.refundedRevenue.toNumber(),
    netRevenue: balance.netRevenue.toNumber(),
    committedPayouts: balance.committedPayouts.toNumber(),
    availableBalance: balance.availableBalance.toNumber(),
  };
}

export type RequestTrainerPayoutInput = {
  trainerId: string;
  amount: number;
  bankName: string;
  accountNo: string;
  accountName: string;
};

/**
 * How many times a serialization failure is retried before the caller is told to
 * try again. Postgres aborts the loser of an SSI conflict immediately, so an
 * immediate retry (no backoff) is the cheapest way to let the second request
 * re-read the balance the winner just changed.
 */
const MAX_SERIALIZATION_RETRIES = 3;

/**
 * True for the Postgres "could not serialize access" / deadlock family, i.e. the
 * transaction did nothing wrong and may simply be replayed.
 */
function isSerializationFailure(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  // P2034: "Transaction failed due to a write conflict or a deadlock".
  if (err.code === "P2034") return true;
  // Some driver paths surface the raw SQLSTATE instead: 40001 serialization_failure,
  // 40P01 deadlock_detected.
  const dbCode = err.meta?.["code"];
  return dbCode === "40001" || dbCode === "40P01";
}

/**
 * Create a payout request, atomically against the trainer's balance.
 *
 * F1 (double-spend): the route used to read the balance and then create the
 * payout in two separate statements. Ten parallel requests for `availableBalance`
 * each read the same balance before any create committed, all ten passed the
 * `amount > availableBalance` check, and the trainer ended up with ten pending
 * payouts worth ten times their balance — all of which look legitimate to an
 * admin.
 *
 * Fix: recompute the balance INSIDE the transaction that creates the payout, at
 * Serializable isolation. Postgres' SSI sees the read of `trainer_payouts` for
 * this trainer conflicting with a concurrent INSERT into the same predicate and
 * aborts all but one of the racing transactions — exactly the write-skew case
 * SSI exists for.
 *
 * Why not an advisory lock (`pg_advisory_xact_lock`)? It would serialise per
 * trainer too, but it only protects code that remembers to take the lock; the
 * balance also depends on refunds and order items that other flows write
 * (routes/orders.ts refund approval), and those flows do not take it. The
 * database-enforced guarantee covers them; a convention does not. Serializable
 * also keeps the whole thing inside the query builder, matching how every other
 * money path in this codebase is written (routes/affiliate.ts, modules/admin/payouts.ts).
 *
 * Throws AppError(400) when the amount exceeds the balance and AppError(409)
 * when the request kept losing serialization races — never a bare 500.
 */
export async function requestTrainerPayout(input: RequestTrainerPayoutInput): Promise<TrainerPayout> {
  const { trainerId, bankName, accountNo, accountName } = input;
  // The route validates 2-decimal precision, so this conversion is exact.
  const amount = new Prisma.Decimal(input.amount);

  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const balance = await computeBalanceDecimal(trainerId, tx);

          if (amount.greaterThan(balance.availableBalance)) {
            throw new AppError(400, "Jumlah melebihi saldo yang tersedia.");
          }

          return tx.trainerPayout.create({
            data: { trainerId, amount, bankName, accountNo, accountName },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (!isSerializationFailure(err)) throw err;
      if (attempt >= MAX_SERIALIZATION_RETRIES) {
        throw new AppError(409, "Permintaan payout bentrok, coba lagi sebentar lagi.");
      }
    }
  }
}

export type ProcessTrainerPayoutInput = {
  payoutId: string;
  status: TrainerPayoutDecision;
  note?: string;
  /** Admin user id recorded on the payout. */
  processedBy: string;
  /**
   * Return the payout with its `trainer` relation (id/name/email) attached.
   *
   * BL-78d: the admin payout queue (modules/admin/payouts.ts) renders the
   * trainer's name next to the decision, so its response has always carried the
   * relation while the trainer-scoped endpoint has not. That single difference
   * was the reason the whole guard was duplicated; making it an option lets both
   * callers share one implementation without changing either response body.
   */
  includeTrainer?: boolean;
};

/** A payout as the admin queue returns it — with the trainer summary attached. */
export type TrainerPayoutWithTrainer = Prisma.TrainerPayoutGetPayload<{
  include: { trainer: { select: { id: true; name: true; email: true } } };
}>;

/**
 * Approve / reject / mark-paid a trainer payout.
 *
 * Status transition guard: only a payout still awaiting processing may be
 * decided. `updateMany` with the `status: "pending"` predicate makes the
 * check-and-set atomic, so two concurrent admin clicks (or a retry) cannot
 * process the same payout twice.
 *
 * Throws AppError(404) when the payout does not exist and AppError(409) when it
 * was already processed — the caller only has to forward the error.
 */
export async function processTrainerPayout(
  input: ProcessTrainerPayoutInput & { includeTrainer: true },
): Promise<TrainerPayoutWithTrainer | null>;
export async function processTrainerPayout(
  input: ProcessTrainerPayoutInput & { includeTrainer?: false },
): Promise<TrainerPayout | null>;
export async function processTrainerPayout(
  input: ProcessTrainerPayoutInput,
): Promise<TrainerPayout | TrainerPayoutWithTrainer | null> {
  const { payoutId, status, note, processedBy, includeTrainer } = input;

  // Existence check BEFORE the guarded write: it is what separates "no such
  // payout" (404) from "already decided" (409), and it means no write is ever
  // attempted against an id that does not exist. The atomicity of the decision
  // still comes from the `status: "pending"` predicate below — this read only
  // classifies the failure, it does not gate the transition.
  const existing = await prisma.trainerPayout.findUnique({ where: { id: payoutId } });
  if (!existing) throw new AppError(404, "Payout tidak ditemukan.");

  const result = await prisma.trainerPayout.updateMany({
    where: { id: payoutId, status: "pending" },
    data: { status, note: note ?? null, processedAt: new Date(), processedBy },
  });

  // The row existed a moment ago, so the only way the guarded update matches
  // nothing is that it is no longer pending.
  if (result.count !== 1) throw new AppError(409, "Payout sudah diproses.");

  // Re-read rather than trusting `updateMany` (which returns a count, not the
  // row) so the response always reflects what is actually stored.
  if (includeTrainer) {
    return prisma.trainerPayout.findUnique({
      where: { id: payoutId },
      include: { trainer: { select: { id: true, name: true, email: true } } },
    });
  }
  return prisma.trainerPayout.findUnique({ where: { id: payoutId } });
}
