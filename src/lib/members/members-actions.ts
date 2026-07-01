"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { assertSuperAdmin } from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/password";

// ─── Schemas ─────────────────────────────────────────────────────────────────────

const createMemberSchema = z.object({
  agencyId: z.string().min(1, "중개사무소를 선택하세요"),
  email: z.email("올바른 이메일을 입력하세요"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
  phone: z.string().optional(),
  role: z.enum(["member", "superadmin"]),
});

const updateMemberSchema = z.object({
  role: z.enum(["member", "superadmin"]).optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
});

// ─── Types ────────────────────────────────────────────────────────────────────────

export interface MemberRow {
  id: string;
  name: string | null;
  email: string;
  agencyId: string;
  agencyName: string;
  role: string;
  phone: string | null;
  createdAt: Date;
}

// ─── Actions ───────────────────────────────────────────────────────────────────────

/**
 * 회원 목록 조회 (superadmin만)
 */
export async function listMembers(filters?: {
  agencyId?: string;
  role?: string;
  search?: string;
}): Promise<MemberRow[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("로그인이 필요합니다");
  await assertSuperAdmin(currentUser.id);

  const where: { agencyId?: string; role?: string; OR?: Array<{ name: { contains: string; mode: "insensitive" } } | { email: { contains: string; mode: "insensitive" } }> } = {};

  if (filters?.agencyId) {
    where.agencyId = filters.agencyId;
  }

  if (filters?.role) {
    where.role = filters.role;
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const members = await db.user.findMany({
    where,
    include: {
      agency: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    agencyId: m.agencyId,
    agencyName: m.agency.name,
    role: m.role,
    phone: m.phone,
    createdAt: m.createdAt,
  }));
}

/**
 * 회원 생성 (superadmin만)
 */
export async function createMember(data: {
  agencyId: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: "member" | "superadmin";
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("로그인이 필요합니다");
  await assertSuperAdmin(currentUser.id);

  const parsed = createMemberSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // 이메일 중복 확인
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) {
    return { error: "이미 가입된 이메일입니다" };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const member = await db.user.create({
      data: {
        agencyId: parsed.data.agencyId,
        email: parsed.data.email,
        passwordHash,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        role: parsed.data.role,
      },
    });

    revalidatePath("/dashboard/settings/members");
    return { success: true, member };
  } catch (_error) {
    return { error: "회원 생성에 실패했습니다" };
  }
}

/**
 * 회원 수정 (superadmin만)
 */
export async function updateMember(
  id: string,
  data: { role?: "member" | "superadmin"; name?: string; phone?: string }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("로그인이 필요합니다");
  await assertSuperAdmin(currentUser.id);

  // 본인 수정 방지 (role 변경 시)
  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    return { error: "회원을 찾을 수 없습니다" };
  }

  if (target.id === currentUser.id && data.role && data.role !== target.role) {
    return { error: "본인의 역할은 수정할 수 없습니다" };
  }

  const parsed = updateMemberSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const updated = await db.user.update({
      where: { id },
      data: parsed.data,
    });

    revalidatePath("/dashboard/settings/members");
    return { success: true, updated };
  } catch (error) {
    return { error: "회원 수정에 실패했습니다" };
  }
}

/**
 * 비밀번호 초기화 (superadmin만)
 */
export async function resetMemberPassword(id: string, newPassword: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("로그인이 필요합니다");
  await assertSuperAdmin(currentUser.id);

  const parsed = resetPasswordSchema.safeParse({ newPassword });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    return { error: "회원을 찾을 수 없습니다" };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  try {
    await db.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { success: true };
  } catch (error) {
    return { error: "비밀번호 초기화에 실패했습니다" };
  }
}

/**
 * 회원 삭제 (superadmin만)
 */
export async function deleteMember(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("로그인이 필요합니다");
  await assertSuperAdmin(currentUser.id);

  // 본인 삭제 방지
  if (id === currentUser.id) {
    return { error: "본인을 삭제할 수 없습니다" };
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    return { error: "회원을 찾을 수 없습니다" };
  }

  try {
    await db.user.delete({
      where: { id },
    });

    revalidatePath("/dashboard/settings/members");
    return { success: true };
  } catch (error) {
    return { error: "회원 삭제에 실패했습니다" };
  }
}

/**
 * Agency 목록 조회 (회원 생성용)
 */
export async function listAgencies() {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("로그인이 필요합니다");
  await assertSuperAdmin(currentUser.id);

  return db.agency.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
