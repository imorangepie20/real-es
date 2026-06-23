import { test, expect } from "@playwright/test";

test("unauthenticated dashboard access redirects to login", async ({ page }) => {
  await page.goto("/dashboard/real-estate");
  await expect(page).toHaveURL(/\/login/);
});

test("register, log out, and log back in", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "test-password-123";

  // 회원가입 → 대시보드
  await page.goto("/register");
  await page.getByLabel("상호명").fill("E2E공인중개사");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard\/real-estate/);

  // 로그아웃 → 로그인 페이지
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login/);

  // 로그인 → 대시보드
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/real-estate/);
});

test("login with wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("definitely-wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("이메일 또는 비밀번호가 올바르지 않습니다")).toBeVisible();
});
