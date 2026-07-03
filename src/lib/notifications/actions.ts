"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

/** 최근 알림 50건 (본인 스코프). 슈퍼어드민만 알림이 쌓임. */
export async function listNotifications(): Promise<NotificationRow[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다");
  const rows = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    link: r.link,
    read: r.read,
    createdAt: r.createdAt,
  }));
}

/** 안 읽은 알림 수 (헤더 벨 뱃지). */
export async function unreadCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return db.notification.count({ where: { userId: user.id, read: false } });
}

/** 단일 알림 읽음 처리 (IDOR 방지: userId 스코프). */
export async function markRead(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
}

/** 안 읽은 알림 전체 읽음 처리. */
export async function markAllRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
}
