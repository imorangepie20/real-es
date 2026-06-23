import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createSession, invalidateSession, validateSessionToken } from "./session";

let agencyId: string;
let userId: string;

beforeAll(async () => {
  const agency = await db.agency.create({ data: { name: "세션테스트부동산" } });
  agencyId = agency.id;
  const user = await db.user.create({
    data: { agencyId, email: `session-${Date.now()}@example.com`, passwordHash: "x", role: "admin" },
  });
  userId = user.id;
});

beforeEach(async () => {
  await db.session.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await db.session.deleteMany({ where: { userId } });
  await db.user.delete({ where: { id: userId } });
  await db.agency.delete({ where: { id: agencyId } });
  await db.$disconnect();
});

describe("session", () => {
  it("creates a session and validates its token to the user", async () => {
    const { token } = await createSession(userId);
    const result = await validateSessionToken(token);
    expect(result?.user.id).toBe(userId);
  });

  it("returns null for an expired session", async () => {
    const { token } = await createSession(userId);
    await db.session.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("returns null after the session is invalidated", async () => {
    const { token } = await createSession(userId);
    await invalidateSession(token);
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("returns null for an unknown token", async () => {
    expect(await validateSessionToken("not-a-real-token")).toBeNull();
  });
});
