import { expect, test } from "@playwright/test";

test("the first account can access superadmin settings", async ({ page }) => {
  await page.goto("/settings/members");
  await expect(page).toHaveURL(/\/settings\/members/);
});
