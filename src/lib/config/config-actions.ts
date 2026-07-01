"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { assertSuperAdmin } from "@/lib/auth/admin";
import { cleanEnvValue } from "./clean-value";

// ─── Schemas ─────────────────────────────────────────────────────────────────────

const updateConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

// ─── Types ────────────────────────────────────────────────────────────────────────

export interface SystemConfigRow {
  id: string;
  key: string;
  value: string;
  category: string;
  updatedAt: Date;
  updatedAtBy: string | null;
}

// ─── 초기 설정값 ───────────────────────────────────────────────────────────────────

const DEFAULT_CONFIGS = [
  { key: "siteName", value: "RESM", category: "site" },
  { key: "contactEmail", value: "", category: "site" },
  { key: "contactPhone", value: "", category: "site" },
  { key: "kakaoMapKey", value: "", category: "api" },
  { key: "vworldKey", value: "", category: "api" },
  { key: "publicDataApiKey", value: "", category: "api" },
];

// ─── Actions ───────────────────────────────────────────────────────────────────────

/**
 * 전체 설정 조회 (superadmin만)
 */
export async function listConfigs(): Promise<SystemConfigRow[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("로그인이 필요합니다");
  await assertSuperAdmin(currentUser.id);

  const configs = await db.systemConfig.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  // 초기 설정값이 없으면 생성
  if (configs.length === 0) {
    await initializeDefaultConfigs(currentUser.id);
    return db.systemConfig.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
  }

  return configs.map((c) => ({
    id: c.id,
    key: c.key,
    value: c.value,
    category: c.category,
    updatedAt: c.updatedAt,
    updatedAtBy: c.updatedAtBy,
  }));
}

/**
 * 카테고리별 설정 조회 (superadmin만)
 */
export async function getConfigsByCategory(category: "site" | "api"): Promise<SystemConfigRow[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("로그인이 필요합니다");
  await assertSuperAdmin(currentUser.id);

  const configs = await db.systemConfig.findMany({
    where: { category },
    orderBy: { key: "asc" },
  });

  return configs.map((c) => ({
    id: c.id,
    key: c.key,
    value: c.value,
    category: c.category,
    updatedAt: c.updatedAt,
    updatedAtBy: c.updatedAtBy,
  }));
}

/**
 * 설정 업데이트 (superadmin만)
 */
export async function updateConfigs(
  updates: Array<{ key: string; value: string }>
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("로그인이 필요합니다");
  await assertSuperAdmin(currentUser.id);

  if (!updates || updates.length === 0) {
    return { success: false, error: "업데이트할 설정이 없습니다" };
  }

  try {
    await db.$transaction(async (tx) => {
      for (const update of updates) {
        const parsed = updateConfigSchema.safeParse(update);
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0].message);
        }

        await tx.systemConfig.upsert({
          where: { key: parsed.data.key },
          create: {
            key: parsed.data.key,
            value: cleanEnvValue(parsed.data.value),
            category: DEFAULT_CONFIGS.find((d) => d.key === parsed.data.key)?.category || "site",
            updatedAtBy: currentUser.id,
          },
          update: {
            value: cleanEnvValue(parsed.data.value),
            updatedAtBy: currentUser.id,
          },
        });
      }
    });

    revalidatePath("/settings/environment");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "설정 업데이트에 실패했습니다";
    return { success: false, error: message };
  }
}

/**
 * 단일 설정 조회 (런타임 참조용)
 */
export async function getConfig(key: string): Promise<string | null> {
  const config = await db.systemConfig.findUnique({
    where: { key },
  });
  return config?.value ?? null;
}

/**
 * 설정값을 숫자로 조회
 */
export async function getConfigNumber(key: string): Promise<number | null> {
  const value = await getConfig(key);
  return value ? Number(value) : null;
}

/**
 * 설정값을 불리언으로 조회
 */
export async function getConfigBoolean(key: string): Promise<boolean> {
  const value = await getConfig(key);
  return value === "true" || value === "1";
}

// ─── Helpers ───────────────────────────────────────────────────────────────────────

/**
 * 초기 설정값 생성 (내부 함수)
 */
async function initializeDefaultConfigs(userId: string) {
  await db.systemConfig.createMany({
    data: DEFAULT_CONFIGS.map((c) => ({
      ...c,
      updatedAtBy: userId,
    })),
    skipDuplicates: true,
  });
}
