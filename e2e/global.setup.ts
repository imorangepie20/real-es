import { test as setup } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = "setup-superadmin@example.com";
  const password = "setup-password-123";

  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();

  try {
    await page.waitForURL(/\/real-estate/, { timeout: 3_000 });
  } catch {
    await page.goto("/register");
    await page.locator("#agencyName").fill("Setup공인중개사");
    await page.locator("#name").fill("Setup 사용자");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator("#passwordConfirm").fill(password);
    await page.locator('[data-slot="checkbox"]').click();
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/real-estate/);
  }

  await page.context().storageState({ path: authFile });
});
