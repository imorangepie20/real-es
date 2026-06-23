import type { User } from "@prisma/client";

import { getSessionToken } from "./cookies";
import { validateSessionToken } from "./session";

export async function getCurrentUser(): Promise<User | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user ?? null;
}
