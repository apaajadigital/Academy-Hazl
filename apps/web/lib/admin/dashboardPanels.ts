/**
 * Independent loading for the admin dashboard's four panels.
 *
 * WHAT WENT WRONG
 * The page fetched all four endpoints through a single `Promise.all` with no
 * `.catch`:
 *
 *     Promise.all([stats, orders, courses, leads])
 *       .then(([s, o, c, l]) => { ... })
 *       .finally(() => setLoading(false))
 *
 * `Promise.all` rejects on the FIRST failure, so one bad endpoint meant the
 * `.then` never ran at all and every widget kept its initial value: no KPI
 * cards, "Belum ada transaksi", "Belum ada kursus", and a leads counter stuck
 * on "—". `finally` still cleared the spinner, so the admin was shown a
 * confident, fully-rendered dashboard reporting that the business had no
 * orders, no courses and no leads. The rejection itself was unhandled.
 *
 * Worse, the KPI cards called `stats.totalUsers.toLocaleString()` directly on
 * whatever `data` arrived. A success envelope missing a field threw
 * "Cannot read properties of undefined (reading 'toLocaleString')" straight
 * into app/error.tsx, replacing the whole console with a 500 page. That is
 * reproducible, and it is why parsing here is strict.
 *
 * THE RULE
 * Each panel succeeds or fails on its own, and a failure is never rendered as a
 * zero. An admin looking at "Rp 0" must be able to trust that it means zero
 * rupiah, not "we could not ask".
 *
 * Pure module — no React, no DOM — so every branch is unit-testable in the
 * `node` environment this workspace runs.
 */

export type PanelState<T> =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; data: T };

export type Stats = {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  pendingCourses: number;
  activeSubscriptions: number;
  refundRate: number;
  avgRating: number;
  retailRevenue: number;
  trends?: {
    totalUsers: string | null;
    totalEnrollments: string | null;
    totalRevenue: string | null;
    retailRevenue: string | null;
    activeSubscriptions: string | null;
  };
};

export type RecentOrder = {
  id: string;
  finalAmount: number;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
  items: { itemTitle: string | null; itemType: string }[];
};

export type PopularCourse = {
  id: string;
  title: string;
  totalEnrolled: number;
  avgRating: string;
  price: string;
  trainer: { name: string };
};

/** A finite number, or nothing. Never coerces `undefined`/""/null to 0. */
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/**
 * Every field the KPI cards format must be present and numeric.
 *
 * Returning null (→ an error panel) rather than defaulting to 0 is the whole
 * point: "Total Pendapatan Rp 0" is a statement about the business, and we are
 * not entitled to make it because a field was missing.
 */
export function parseStats(data: unknown): Stats | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const totalUsers = num(d.totalUsers);
  const totalCourses = num(d.totalCourses);
  const totalEnrollments = num(d.totalEnrollments);
  const totalRevenue = num(d.totalRevenue);
  const activeSubscriptions = num(d.activeSubscriptions);
  const refundRate = num(d.refundRate);
  const avgRating = num(d.avgRating);
  const retailRevenue = num(d.retailRevenue);

  if (
    totalUsers === null ||
    totalCourses === null ||
    totalEnrollments === null ||
    totalRevenue === null ||
    activeSubscriptions === null ||
    refundRate === null ||
    avgRating === null ||
    retailRevenue === null
  ) {
    return null;
  }

  const t = d.trends as Record<string, unknown> | undefined;
  return {
    totalUsers,
    totalCourses,
    totalEnrollments,
    totalRevenue,
    // Not rendered by any card; absent is genuinely fine.
    pendingCourses: num(d.pendingCourses) ?? 0,
    activeSubscriptions,
    refundRate,
    avgRating,
    retailRevenue,
    trends: t
      ? {
          totalUsers: str(t.totalUsers),
          totalEnrollments: str(t.totalEnrollments),
          totalRevenue: str(t.totalRevenue),
          retailRevenue: str(t.retailRevenue),
          activeSubscriptions: str(t.activeSubscriptions),
        }
      : undefined,
  };
}

/**
 * Keeps only rows the table can actually render. `order.user.name.slice(...)`
 * throws on a row without a user, and one malformed row would take the entire
 * console down with it.
 */
export function parseOrders(data: unknown): RecentOrder[] | null {
  if (!Array.isArray(data)) return null;
  return data.flatMap((raw): RecentOrder[] => {
    const o = raw as Record<string, unknown>;
    const user = o?.user as Record<string, unknown> | undefined;
    const id = str(o?.id);
    const finalAmount = num(o?.finalAmount);
    const name = str(user?.name);
    if (!id || finalAmount === null || !name) return [];
    return [
      {
        id,
        finalAmount,
        status: str(o.status) ?? "unknown",
        createdAt: str(o.createdAt) ?? "",
        user: { name, email: str(user?.email) ?? "" },
        items: Array.isArray(o.items)
          ? (o.items as RecentOrder["items"]).map((it) => ({
              itemTitle: str((it as Record<string, unknown>)?.itemTitle),
              itemType: str((it as Record<string, unknown>)?.itemType) ?? "",
            }))
          : [],
      },
    ];
  });
}

/** Accepts both `{ courses: [...] }` and a bare array, as the page always did. */
export function parseCourses(data: unknown): PopularCourse[] | null {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { courses?: unknown })?.courses)
      ? ((data as { courses: unknown[] }).courses)
      : null;
  if (rows === null) return null;

  return rows.flatMap((raw): PopularCourse[] => {
    const c = raw as Record<string, unknown>;
    const id = str(c?.id);
    const title = str(c?.title);
    const totalEnrolled = num(c?.totalEnrolled);
    if (!id || !title || totalEnrolled === null) return [];
    const trainer = c.trainer as Record<string, unknown> | undefined;
    return [
      {
        id,
        title,
        totalEnrolled,
        avgRating: str(c.avgRating) ?? String(num(c.avgRating) ?? 0),
        price: str(c.price) ?? String(num(c.price) ?? 0),
        trainer: { name: str(trainer?.name) ?? "Trainer Jago" },
      },
    ];
  });
}

/** Leads uses the envelope's `meta.total`, not its `data`. */
export function parseNewLeads(_data: unknown, meta: unknown): number | null {
  return num((meta as Record<string, unknown> | undefined)?.total);
}

/**
 * Fetch one panel. Resolves — never rejects — so a caller cannot lose three
 * good panels to one bad one.
 *
 * `{ kind: "error" }` covers network rejection, non-2xx, unparseable body,
 * `success !== true`, and a payload the parser refuses.
 */
export async function loadPanel<T>(
  path: string,
  parse: (data: unknown, meta: unknown) => T | null,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PanelState<T>> {
  let res: Response;
  try {
    res = await fetchImpl(path, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return { kind: "error" };
  }

  if (!res.ok) return { kind: "error" };

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { kind: "error" };
  }

  const envelope = body as { success?: unknown; data?: unknown; meta?: unknown } | null;
  if (envelope?.success !== true) return { kind: "error" };

  const parsed = parse(envelope.data, envelope.meta);
  return parsed === null ? { kind: "error" } : { kind: "ready", data: parsed };
}
