import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

import { createSignupUser } from "./create-signup-user";

const signup = {
  agencyName: "테스트 중개사",
  agencyZipcode: null,
  agencyAddress: null,
  agencyPhone: null,
  name: "테스트 사용자",
  phone: null,
  email: "test@example.com",
};

function transaction(userCount: number) {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
    agency: { create: vi.fn().mockResolvedValue({ id: "agency-1" }) },
    user: {
      count: vi.fn().mockResolvedValue(userCount),
      create: vi.fn().mockResolvedValue({ id: "user-1" }),
    },
  };
}

describe("createSignupUser", () => {
  it("serializes the first-user decision and creates the first user as superadmin", async () => {
    const tx = transaction(0);

    const result = await createSignupUser(tx as unknown as Prisma.TransactionClient, signup, "password-hash");

    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.user.count.mock.invocationCallOrder[0]);
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: "superadmin" }),
    });
    expect(result.isFirstUser).toBe(true);
  });

  it("creates later users as members", async () => {
    const tx = transaction(1);

    const result = await createSignupUser(tx as unknown as Prisma.TransactionClient, signup, "password-hash");

    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: "member" }),
    });
    expect(result.isFirstUser).toBe(false);
  });
});
