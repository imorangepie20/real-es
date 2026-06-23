import { test, expect } from "@playwright/test";

test("매물 수집 페이지가 열리고 동 선택 UI가 보인다", async ({ page }) => {
  await page.goto("/dashboard/naver");
  await expect(page.getByRole("heading", { name: "매물 수집" })).toBeVisible();
  await expect(page.getByRole("combobox").first()).toBeVisible();
});

test("엑셀 export 라우트가 캐시 단지의 xlsx를 반환한다 (102614)", async ({ request }) => {
  const res = await request.get("/api/naver/export?complexNumber=102614");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("spreadsheetml");
});
