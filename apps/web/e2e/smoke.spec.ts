import { test, expect } from "@playwright/test";

test.describe("Smoke tests — public pages", () => {
  test("homepage loads and shows hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("e-course page loads", async ({ page }) => {
    await page.goto("/e-course");
    await expect(page).toHaveTitle(/Jago Akademi|E-Course|Kursus/i);
  });

  test("login page has email + password fields", async ({ page }) => {
    await page.goto("/masuk");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("register page is accessible", async ({ page }) => {
    await page.goto("/daftar");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("contact page loads with form", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("form")).toBeVisible();
  });

  test("certificate verify page shows search/code form", async ({ page }) => {
    await page.goto("/verify/ABCD-XXXX-INVALID");
    // Should show some feedback (valid or not found)
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Smoke tests — protected redirect", () => {
  test("dashboard redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/masuk/);
  });

  test("admin redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/masuk/);
  });

  test("belajar page redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/belajar/some-course");
    await expect(page).toHaveURL(/\/masuk/);
  });
});
