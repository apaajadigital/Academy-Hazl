import type { Page } from "@playwright/test";

/**
 * Deterministic stand-ins for the four admin dashboard endpoints.
 *
 * Extracted so the layout spec and the partial-failure spec drive the console
 * from the same fixture instead of each inventing its own shapes — the two
 * would otherwise drift, and a parser change would only be caught by whichever
 * happened to guess right.
 *
 * Nothing here touches a database or an account. `fakeToken` is a syntactically
 * valid JWT with a far-future `exp` because lib/auth/token.ts decodes the
 * payload to decide whether to refresh; it is never presented to a server.
 */

export type Panel = "stats" | "orders" | "courses" | "leads";

export const ENDPOINT: Record<Panel, string> = {
  stats: "**/api/admin/stats*",
  orders: "**/api/admin/orders*",
  courses: "**/api/admin/courses*",
  leads: "**/api/admin/leads*",
};

export const STATS = {
  totalUsers: 120,
  totalCourses: 8,
  totalEnrollments: 340,
  totalRevenue: 15000000,
  pendingCourses: 2,
  activeSubscriptions: 30,
  refundRate: 1.5,
  avgRating: 4.6,
  retailRevenue: 2000000,
};

export const ORDERS = Array.from({ length: 6 }, (_, i) => ({
  id: `o${i + 1}`,
  finalAmount: 250000 + i * 1000,
  status: (["paid", "pending", "failed", "expired"] as const)[i % 4],
  createdAt: "2026-08-01T00:00:00.000Z",
  // The first row keeps the name the partial-failure spec looks for.
  user: { name: i === 0 ? "Budi Pembeli" : `Pembeli ${i + 1}`, email: `pembeli${i + 1}@example.test` },
  items: [{ itemTitle: `Kursus Uji ${i + 1}`, itemType: "course" }],
}));

export const COURSES = {
  // `limit=5` on the real endpoint — the skeleton is sized for five rows, so a
  // fixture returning one would make every loading-vs-ready height comparison
  // measure the fixture rather than the layout.
  courses: Array.from({ length: 5 }, (_, i) => ({
    id: `c${i + 1}`,
    title: i === 0 ? "Kursus Terpopuler Uji" : `Kursus Populer ${i + 1}`,
    totalEnrolled: 42 - i * 5,
    avgRating: "4.7",
    price: "199000",
  })),
};

/**
 * The pathological payload: values long enough to break a grid that lacks
 * `min-w-0`, and an amount with more digits than any real order. Used by the
 * layout spec to prove the page does not depend on data being short.
 */
export const EXTREME = {
  stats: { ...STATS, totalRevenue: 987654321098, totalUsers: 9876543 },
  orders: [
    {
      id: "o-long",
      finalAmount: 987654321098,
      status: "pending",
      createdAt: "2026-08-01T00:00:00.000Z",
      user: {
        name: "Bartholomew Maximilian Kusumaningrat Wijayakusuma Adiputra",
        email: "bartholomew.maximilian.kusumaningrat@a-very-long-corporate-domain.example.test",
      },
      items: [
        {
          itemTitle:
            "Kursus Digital Marketing Tingkat Lanjut untuk Profesional Bersertifikasi Internasional Angkatan Kedua",
          itemType: "course",
        },
      ],
    },
  ],
  courses: {
    courses: [
      {
        id: "c-long",
        title:
          "Kursus Digital Marketing Tingkat Lanjut untuk Profesional Bersertifikasi Internasional Angkatan Kedua",
        totalEnrolled: 1234567,
        avgRating: "4.9",
        price: "199000",
        trainer: { name: "Dr. Ir. Bartholomew Maximilian Kusumaningrat, M.Kom., Ph.D." },
      },
    ],
  },
  leadsTotal: 9876543,
};

export function json(body: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

function fakeToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: "e2e-admin", exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  return `e2e.${payload}.signature`;
}

/** Seed storage and answer `/api/auth/me` as a super_admin. */
export async function signInAsAdmin(page: Page) {
  await page.addInitScript((t) => {
    sessionStorage.setItem("access_token", t);
    localStorage.setItem("jg_access_token", t);
  }, fakeToken());

  await page.route("**/api/auth/me", (route) =>
    route.fulfill(
      json({
        success: true,
        data: {
          name: "Admin Uji",
          email: "admin@example.test",
          avatarUrl: null,
          roles: [{ role: "super_admin" }],
        },
      }),
    ),
  );
}

export type Mode = "ok" | "extreme" | "abort" | "500" | "malformed" | "empty";

/** Serve one panel in the given mode. */
export async function serve(
  page: Page,
  panel: Panel,
  mode: Mode,
  opts: { delayMs?: number } = {},
) {
  await page.route(ENDPOINT[panel], async (route) => {
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    if (mode === "abort") return route.abort();
    if (mode === "500") return route.fulfill(json({ success: false, error: { code: "ERR" } }, 500));
    if (mode === "malformed") {
      return route.fulfill(json({ success: true, data: { totalUsers: 1 }, meta: {} }));
    }
    if (mode === "empty") {
      const empty: Record<Panel, unknown> = {
        stats: { success: true, data: STATS },
        orders: { success: true, data: [] },
        courses: { success: true, data: { courses: [] } },
        leads: { success: true, data: null, meta: { total: 0 } },
      };
      return route.fulfill(json(empty[panel]));
    }
    if (mode === "extreme") {
      const x: Record<Panel, unknown> = {
        stats: { success: true, data: EXTREME.stats },
        orders: { success: true, data: EXTREME.orders },
        courses: { success: true, data: EXTREME.courses },
        leads: { success: true, data: null, meta: { total: EXTREME.leadsTotal } },
      };
      return route.fulfill(json(x[panel]));
    }
    const ok: Record<Panel, unknown> = {
      stats: { success: true, data: STATS },
      orders: { success: true, data: ORDERS },
      courses: { success: true, data: COURSES },
      leads: { success: true, data: null, meta: { total: 4 } },
    };
    return route.fulfill(json(ok[panel]));
  });
}

export const ALL_PANELS: Panel[] = ["stats", "orders", "courses", "leads"];

/** Serve every panel, with per-panel overrides. */
export async function serveAll(page: Page, overrides: Partial<Record<Panel, Mode>> = {}) {
  for (const p of ALL_PANELS) await serve(page, p, overrides[p] ?? "ok");
}

/** How far the document can scroll sideways. Anything above 1 is a defect. */
export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return { scrollWidth: el.scrollWidth, innerWidth: window.innerWidth };
  });
}
