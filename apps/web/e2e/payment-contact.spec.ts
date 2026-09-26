/**
 * E2E — payment success onboarding (Private Class) and contact-form lead flow.
 *
 * All API responses are mocked with page.route(); no backend is required.
 * /payment/success reads the access token from web storage (lib/auth/token.ts)
 * before calling GET /api/orders/:id — the tests seed a dummy non-expiring JWT
 * via addInitScript (the API is mocked, so it is never verified).
 */
import { test, expect } from "@playwright/test";
import { collectConsoleErrors, okEnvelope, seedAuthToken } from "./mock-utils";

// ─── /payment/success ─────────────────────────────────────────────────────────

test.describe("Payment success page (/payment/success)", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthToken(page);
    // Navbar checks login state with the seeded token — keep it deterministic.
    await page.route("**/api/auth/me", (route) =>
      route.fulfill(
        okEnvelope({ id: "u1", name: "E2E User", email: "e2e@example.com", role: "member" }),
      ),
    );
  });

  test("paid private-class order shows onboarding card with WA CTAs", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.route("**/api/orders/order-pc-1", (route) =>
      route.fulfill(
        okEnvelope({
          id: "order-pc-1",
          status: "paid",
          items: [
            {
              id: "it1",
              itemTitle: "Private Class Pro",
              privateClass: {
                waGroupLink: "https://chat.whatsapp.com/abc",
                onboardingContact: "6285283423737",
                liveSchedule: null,
              },
            },
          ],
        }),
      ),
    );

    await page.goto("/payment/success?orderId=order-pc-1");

    await expect(
      page.getByRole("heading", { name: "Pembayaran Berhasil!" }),
    ).toBeVisible();

    // Private Class onboarding card
    await expect(
      page.getByRole("heading", { name: "Selamat datang di Private Class!" }),
    ).toBeVisible();

    const chatAdmin = page.locator("#success-pc-chat-admin-btn");
    await expect(chatAdmin).toBeVisible();
    await expect(chatAdmin).toContainText("Chat Admin Sekarang");
    await expect(chatAdmin).toHaveAttribute("href", /wa\.me\/6285283423737/);

    const joinGroup = page.locator("#success-pc-join-group-btn");
    await expect(joinGroup).toBeVisible();
    await expect(joinGroup).toContainText("Join Grup Mentoring");
    await expect(joinGroup).toHaveAttribute("href", "https://chat.whatsapp.com/abc");

    expect(consoleErrors.errors).toEqual([]);
  });

  test("regular paid order shows generic block without onboarding card", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.route("**/api/orders/order-reg-1", (route) =>
      route.fulfill(
        okEnvelope({
          id: "order-reg-1",
          status: "paid",
          items: [{ id: "it1", itemTitle: "Kursus Reguler" }],
        }),
      ),
    );

    await page.goto("/payment/success?orderId=order-reg-1");

    await expect(
      page.getByRole("heading", { name: "Pembayaran Berhasil!" }),
    ).toBeVisible();

    // Generic "Apa selanjutnya?" block still present
    await expect(page.getByText("Apa selanjutnya?")).toBeVisible();

    // No Private Class onboarding card
    await expect(
      page.getByRole("heading", { name: "Selamat datang di Private Class!" }),
    ).toHaveCount(0);
    await expect(page.locator("#success-pc-chat-admin-btn")).toHaveCount(0);
    await expect(page.locator("#success-pc-join-group-btn")).toHaveCount(0);

    expect(consoleErrors.errors).toEqual([]);
  });
});

// ─── /contact ─────────────────────────────────────────────────────────────────

test.describe("Contact page (/contact)", () => {
  test("form submits lead with source=contact and a message field (BL-44 regression)", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    let leadBody: Record<string, unknown> | null = null;
    await page.route("**/api/leads", async (route) => {
      leadBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill(okEnvelope({ id: "x", message: "ok" }, undefined, 201));
    });

    await page.goto("/contact");

    await page.fill("#name", "Siti E2E");
    await page.fill("#email", "siti.e2e@example.com");
    await page.fill("#message", "Halo, saya butuh bantuan pembayaran.");
    await page.getByRole("button", { name: "Kirim Pesan" }).click();

    // Success feedback
    await expect(page.getByRole("heading", { name: "Pesan terkirim!" })).toBeVisible();

    // BL-44 regression: body must carry source=contact AND a message field
    expect(leadBody).not.toBeNull();
    const body = leadBody as unknown as Record<string, unknown>;
    expect(body.source).toBe("contact");
    expect(typeof body.message).toBe("string");
    expect(body.message as string).toContain("Halo, saya butuh bantuan pembayaran.");
    expect(body).toMatchObject({ name: "Siti E2E", email: "siti.e2e@example.com" });

    expect(consoleErrors.errors).toEqual([]);
  });
});
