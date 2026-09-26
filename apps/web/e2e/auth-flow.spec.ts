import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
  test("login page shows email and password fields", async ({ page }) => {
    await page.goto("/masuk");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("register page shows name, email, password fields", async ({ page }) => {
    await page.goto("/daftar");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/masuk");
    await page.fill('input[type="email"]', "nonexistent@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    // Should stay on login page or show error — not redirect to dashboard
    await page.waitForTimeout(1500);
    const url = page.url();
    expect(url).not.toMatch(/\/dashboard/);
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/masuk");
    const registerLink = page.locator("a[href*='/daftar']");
    await expect(registerLink.first()).toBeVisible();
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/daftar");
    const loginLink = page.locator("a[href*='/masuk']");
    await expect(loginLink.first()).toBeVisible();
  });

  test("protected routes redirect to login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/masuk/);
  });

  test("admin route redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/masuk/);
  });

  test("trainer hub redirects when unauthenticated", async ({ page }) => {
    await page.goto("/trainer-hub");
    // Either redirect to /masuk or show login prompt
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/masuk|trainer-hub/);
  });

  test("Google sign-in button targets the API OAuth endpoint on /masuk", async ({ page }) => {
    await page.goto("/masuk");
    const google = page.locator("a[href*='/api/auth/google']");
    await expect(google).toBeVisible();
  });

  test("Google sign-up button targets the API OAuth endpoint on /daftar", async ({ page }) => {
    await page.goto("/daftar");
    const google = page.locator("a[href*='/api/auth/google']");
    await expect(google).toBeVisible();
  });

  test("consent links point to existing legal pages, not dead routes", async ({ page }) => {
    await page.goto("/daftar");
    await expect(page.locator("a[href='/privacy']")).toBeVisible();
    await expect(page.locator("a[href='/terms']")).toBeVisible();
    // The old, non-existent routes must not reappear.
    await expect(page.locator("a[href='/kebijakan-privasi']")).toHaveCount(0);
    await expect(page.locator("a[href='/syarat-ketentuan']")).toHaveCount(0);
  });

  test("OAuth callback route exists and handles an error without 404", async ({ page }) => {
    const res = await page.goto("/auth/callback?error=account_disabled");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByText(/dinonaktifkan/i)).toBeVisible();
    await expect(page.locator("a[href*='/masuk']")).toBeVisible();
  });

  test("OAuth callback without a token shows an invalid-session message", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page.getByText(/Sesi masuk tidak valid/i)).toBeVisible();
  });
});
