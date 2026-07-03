import { db } from "@/lib/db";

/** 모든 슈퍼어드민에게 알림 생성. 시스템 이벤트(signup/contract/property)에서 호출.
 *  서버 전용(클라 import 금지). 부작용=DB write만, 반환값 안 씀. */
export async function notifySuperAdmins(
  type: string,
  title: string,
  description?: string,
  link?: string,
): Promise<void> {
  const admins = await db.user.findMany({
    where: { role: "superadmin" },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await db.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type, title, description, link })),
  });
}
