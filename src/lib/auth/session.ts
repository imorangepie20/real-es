import { createHash, randomBytes } from "crypto";

import type { Session, User } from "@prisma/client";

import { db } from "@/lib/db";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30일

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}

export async function validateSessionToken(
  token: string,
): Promise<{ user: User; session: Session } | null> {
  const found = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!found) return null;
  if (found.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: found.id } }).catch(() => {});
    return null;
  }
  const { user, ...session } = found;
  return { user, session };
}

export async function invalidateSession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
