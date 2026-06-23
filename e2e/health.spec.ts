import { test, expect } from "@playwright/test";

test("GET /api/health returns ok when DB is reachable", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
