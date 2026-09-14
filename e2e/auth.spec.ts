import { test, expect } from "@playwright/test";

test("unauthenticated dashboard access redirects to login", async ({ page }) => {
  await page.goto("/real-estate");
  await expect(page).toHaveURL(/\/login/);
});

test("register, log out, and log back in", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "test-password-123";

  // 회원가입 → 대시보드
  await page.goto("/register");
  await page.locator("#agencyName").fill("E2E공인중개사");
  await page.locator("#name").fill("E2E 사용자");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#passwordConfirm").fill(password);
  await page.locator('[data-slot="checkbox"]').click();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/real-estate/);

  // 로그아웃 → 로그인 페이지
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login/);

  // 로그인 → 대시보드
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/real-estate/);

  await page.goto("/settings/members");
  await expect(page).toHaveURL(/\/real-estate/);
});

test("login with wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("nobody@example.com");
  await page.locator("#password").fill("definitely-wrong");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("이메일 또는 비밀번호가 올바르지 않습니다")).toBeVisible();
});
