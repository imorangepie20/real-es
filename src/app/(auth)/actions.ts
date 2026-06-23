"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "@/lib/auth/cookies";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, invalidateSession } from "@/lib/auth/session";

export type AuthState = { error: string | null };

const DASHBOARD = "/dashboard/real-estate";

const signupSchema = z.object({
  agencyName: z.string().min(1, "상호명을 입력하세요"),
  name: z.string().trim().optional(),
  email: z.email("올바른 이메일을 입력하세요"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
});

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    agencyName: formData.get("agencyName"),
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { agencyName, name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "이미 가입된 이메일입니다" };
  }

  const passwordHash = await hashPassword(password);
  const user = await db.$transaction(async (tx) => {
    const agency = await tx.agency.create({ data: { name: agencyName } });
    return tx.user.create({
      data: { agencyId: agency.id, email, passwordHash, name: name ?? null, role: "admin" },
    });
  });

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  redirect(DASHBOARD);
}

const loginSchema = z.object({
  email: z.email("올바른 이메일을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
  }

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  redirect(DASHBOARD);
}

export async function logoutAction(): Promise<void> {
  const token = await getSessionToken();
  if (token) await invalidateSession(token);
  await clearSessionCookie();
  redirect("/login");
}
