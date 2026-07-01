import { db } from "@/lib/db";

/**
 * superadmin 권한 검증
 * @throws {Error} 권한이 없는 경우
 */
export async function assertSuperAdmin(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "superadmin") {
    throw new Error("접근 권한이 없습니다");
  }
}

/**
 * 현재 사용자가 superadmin인지 확인
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } });
  return user?.role === "superadmin";
}
