"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "@/lib/auth/cookies";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, invalidateSession } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/current-user";
import { notifySuperAdmins } from "@/lib/notifications/notify";
import { findEmdByAddr } from "@/lib/realprice/geocode";

export type AuthState = { error: string | null };

const DASHBOARD = "/real-estate";

const signupSchema = z.object({
  agencyName: z.string().min(1, "상호명을 입력하세요"),
  agencyZipcode: z.string().trim().optional(),
  agencyAddress: z.string().trim().optional(),
  agencyPhone: z.string().trim().optional(),
  name: z.string().trim().min(1, "이름을 입력하세요"),
  phone: z.string().trim().optional(),
  email: z.email("올바른 이메일을 입력하세요"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
  passwordConfirm: z.string().min(1, "비밀번호 확인을 입력하세요"),
  agree: z.string().optional(),
}).refine((d) => d.password === d.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["passwordConfirm"],
}).refine((d) => d.agree === "on", {
  message: "이용약관에 동의해주세요",
  path: ["agree"],
});

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    agencyName: formData.get("agencyName"),
    agencyZipcode: formData.get("agencyZipcode") || undefined,
    agencyAddress: formData.get("agencyAddress") || undefined,
    agencyPhone: formData.get("agencyPhone") || undefined,
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
    agree: formData.get("agree") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { agencyName, agencyZipcode, agencyAddress, agencyPhone, name, phone, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "이미 가입된 이메일입니다" };
  }

  const passwordHash = await hashPassword(password);
  const userCount = await db.user.count();
  const isFirstUser = userCount === 0;

  const user = await db.$transaction(async (tx) => {
    const agency = await tx.agency.create({ data: { name: agencyName, zipcode: agencyZipcode ?? null, address: agencyAddress ?? null, phone: agencyPhone ?? null } });
    return tx.user.create({
      data: { agencyId: agency.id, email, passwordHash, name, phone: phone ?? null, role: isFirstUser ? "superadmin" : "member" },
    });
  });

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  // 첫 가입자(자동 superadmin)는 제외 — 본인 외 알릴 대상이 없음.
  if (!isFirstUser) {
    await notifySuperAdmins("member", `새 회원 가입: ${name}`, `${email} · ${agencyName}`, "/settings/members");
  }
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

// ─── 본인 프로필 수정 (로그인 사용자) ────────────────────────────────────────────

export type ProfileState = { error: string | null };

export async function updateProfile(input: {
  name: string;
  phone: string;
  address: string;
}): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다" };
  const name = input.name.trim();
  const address = input.address.trim();
  if (!name) return { error: "이름을 입력하세요" };

  // 주소가 변경됐으면 VWorld geocode → 법정동 매핑 갱신(실패 시 null — 홈 요약에서 생략).
  let homeLawdCd: string | null = user.homeLawdCd;
  let homeNaverCode: string | null = user.homeNaverCode;
  if (address !== (user.address ?? "")) {
    if (address) {
      const mapped = await findEmdByAddr(address);
      homeLawdCd = mapped?.lawdCd ?? null;
      homeNaverCode = mapped?.naverCode ?? null;
    } else {
      homeLawdCd = null;
      homeNaverCode = null;
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name,
      phone: input.phone.trim() || null,
      address: address || null,
      homeLawdCd,
      homeNaverCode,
    },
  });
  revalidatePath("/profile");
  revalidatePath("/real-estate");
  return { error: null };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다" };
  if (input.newPassword.length < 8) return { error: "새 비밀번호는 8자 이상이어야 합니다" };

  const fresh = await db.user.findUnique({ where: { id: user.id } });
  if (!fresh || !(await verifyPassword(input.currentPassword, fresh.passwordHash))) {
    return { error: "현재 비밀번호가 올바르지 않습니다" };
  }
  const passwordHash = await hashPassword(input.newPassword);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { error: null };
}
