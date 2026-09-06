import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("sign-in page renders its form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("sign-up page renders and links back to sign in", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await page.getByRole("link", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("password reset page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
  });

  test("unknown route shows the 404 page", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /couldn't find that page/i })).toBeVisible();
  });
});

test.describe("auth boundary", () => {
  test("the dashboard redirects a signed-out visitor to sign in", async ({ page }) => {
    await page.goto("/app/nail-bar/appointments");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fnail-bar%2Fappointments$/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("the app index redirects to sign in", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("security headers", () => {
  test("pages refuse to be framed, except the chat embed", async ({ request }) => {
    const login = await request.get("/login");
    expect(login.headers()["x-frame-options"]).toBe("DENY");
    expect(login.headers()["x-content-type-options"]).toBe("nosniff");

    const embed = await request.get("/s/nail-bar/chat", { maxRedirects: 0 });
    expect(embed.headers()["x-frame-options"]).toBeUndefined();
  });
});

test.describe("public API guards", () => {
  test("the chat endpoint rejects a malformed body", async ({ request }) => {
    const res = await request.post("/api/chat", { data: { nope: true } });
    expect(res.status()).toBe(400);
  });

  test("the automation cron endpoint refuses an unauthenticated call", async ({ request }) => {
    const res = await request.get("/api/cron/automations");
    expect([401, 503]).toContain(res.status());
  });

  test("the availability endpoint validates its parameters", async ({ request }) => {
    const res = await request.get("/api/salons/nail-bar/availability?date=nope&service=nope");
    expect(res.status()).toBe(400);
  });
});
