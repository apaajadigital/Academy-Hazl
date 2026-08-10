import { test, expect } from "@playwright/test";

/**
 * Early Access submit states.
 *
 * Context: the submit handler used to `setSubmitted(true)` inside its `catch`,
 * so any network failure rendered "Pendaftaran Berhasil!" together with a
 * promise of an Early Bird coupon and a webinar invitation — while nothing had
 * been stored. The comment in the code called it a fallback "to avoid
 * drop-off". These tests exist so that behaviour cannot come back.
 *
 * apps/web has no DOM unit-test runner, so the four required cases (success,
 * reject, non-2xx, timeout) are covered here at the browser level instead.
 */

const PAGE = "/early-access";
const SUCCESS_TEXT = /Pendaftaran Berhasil/i;

async function fillAndSubmit(page: import("@playwright/test").Page) {
  await page.getByLabel(/nama/i).fill("Uji Coba");
  await page.getByLabel(/email/i).fill("uji@example.com");
  await page.getByRole("button", { name: /Daftar Akses Awal|Coba Lagi/i }).click();
}

test.describe("Early Access — submit states", () => {
  test("shows success only when the API really succeeds", async ({ page }) => {
    await page.route("**/api/waitlist", (route) =>
      route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: {} }) }),
    );
    await page.goto(PAGE);
    await fillAndSubmit(page);
    await expect(page.getByText(SUCCESS_TEXT)).toBeVisible();
  });

  test("network rejection shows an honest error, never success", async ({ page }) => {
    await page.route("**/api/waitlist", (route) => route.abort("failed"));
    await page.goto(PAGE);
    await fillAndSubmit(page);

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/belum tersimpan/i)).toBeVisible();
    await expect(page.getByText(SUCCESS_TEXT)).toHaveCount(0);
  });

  test("non-2xx shows the server message, never success", async ({ page }) => {
    await page.route("**/api/waitlist", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Email sudah terdaftar." } }),
      }),
    );
    await page.goto(PAGE);
    await fillAndSubmit(page);

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/Email sudah terdaftar/i)).toBeVisible();
    await expect(page.getByText(SUCCESS_TEXT)).toHaveCount(0);
  });

  test("timeout shows an error and keeps the typed values for retry", async ({ page }) => {
    // Never fulfilled → the fetch rejects when the context tears down, which is
    // the same code path a real timeout takes.
    await page.route("**/api/waitlist", async (route) => {
      await new Promise((r) => setTimeout(r, 5000));
      await route.abort("timedout");
    });
    await page.goto(PAGE);
    await fillAndSubmit(page);

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(SUCCESS_TEXT)).toHaveCount(0);
    // The visitor must not have to retype anything to retry.
    await expect(page.getByLabel(/nama/i)).toHaveValue("Uji Coba");
    await expect(page.getByLabel(/email/i)).toHaveValue("uji@example.com");
    await expect(page.getByRole("button", { name: /Coba Lagi/i })).toBeVisible();
  });

  test("no fake countdown is rendered", async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByText(/Penawaran Spesial Berakhir Dalam/i)).toHaveCount(0);
  });
});
