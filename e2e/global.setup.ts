import { test as setup } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = `setup-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("상호명").fill("Setup공인중개사");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("setup-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/dashboard\/real-estate/);
  await page.context().storageState({ path: authFile });
});
