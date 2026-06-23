import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3001", trace: "on-first-retry" },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "auth",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] }, // 미인증 컨텍스트
      dependencies: ["setup"],
    },
    {
      name: "chromium",
      testIgnore: [/auth\.spec\.ts/, /global\.setup\.ts/],
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
