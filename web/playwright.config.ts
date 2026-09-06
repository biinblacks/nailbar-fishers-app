import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests: build once, then drive the real app in Chromium.
 *
 * They deliberately avoid a live database — Supabase points at a closed port,
 * so every call fails fast and the app behaves as "signed out". That exercises
 * routing, middleware, rendering and the auth boundary in CI without secrets.
 * To run against a real project, export the real NEXT_PUBLIC_SUPABASE_* values
 * before `npm run test:e2e` and add signed-in journeys of your own.
 */
const PORT = Number(process.env.E2E_PORT ?? 3123);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Sandboxes and CI images often ship a Chromium that does not match the
        // pinned Playwright build. Point PLAYWRIGHT_CHROMIUM_PATH at it to reuse
        // it; otherwise Playwright uses its own download.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } } : {}),
      },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:9",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "e2e-anon-key",
      NEXT_PUBLIC_SITE_URL: baseURL,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
