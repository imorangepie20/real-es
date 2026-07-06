"use server";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { monthPrefix } from "@/lib/calendar/month-grid";
import { propertyCalendarEvents, type PropertyDateEvent } from "@/lib/calendar/property-events";
import { CALENDAR_CATEGORIES } from "@/lib/calendar/categories";

export type EventInput = {
  title: string; date: string; startTime?: string | null; category: string;
  memo?: string | null; propertyId?: string | null; customerId?: string | null;
};
export type EventRow = {
  id: string; title: string; date: string; startTime: string | null; category: string;
  memo: string | null; propertyId: string | null; propertyLabel: string | null;
  customerId: string | null; customerLabel: string | null;
};
export type CalendarOption = { id: string; label: string };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다");
  return user;
}

const CATS = new Set(CALENDAR_CATEGORIES.map((c) => c.value as string));

function toData(input: EventInput) {
  return {
    title: (input.title ?? "").trim(),
    date: String(input.date ?? "").replace(/[^0-9]/g, "").slice(0, 8),
    startTime: input.startTime?.trim() || null,
    category: CATS.has(input.category) ? input.category : "기타",
    memo: input.memo?.trim() || null,
  };
}

async function ownedId(model: "property" | "customer", userId: string, id?: string | null): Promise<string | null> {
  if (!id) return null;
  const row = model === "property"
    ? await db.property.findFirst({ where: { id, userId }, select: { id: true } })
    : await db.customer.findFirst({ where: { id, userId }, select: { id: true } });
  return row ? row.id : null;
}

export async function loadCalendar(year: number, month: number): Promise<{
  events: EventRow[]; propertyDates: PropertyDateEvent[]; properties: CalendarOption[]; customers: CalendarOption[];
}> {
  const user = await requireUser();
  const prefix = monthPrefix(year, month);
  const rows = await db.event.findMany({
    where: { userId: user.id, date: { startsWith: prefix } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: { property: { select: { name: true, complexName: true } }, customer: { select: { name: true } } },
  });
  const events: EventRow[] = rows.map((r) => ({
    id: r.id, title: r.title, date: r.date, startTime: r.startTime, category: r.category, memo: r.memo,
    propertyId: r.propertyId, propertyLabel: r.property?.name ?? r.property?.complexName ?? null,
    customerId: r.customerId, customerLabel: r.customer?.name ?? null,
  }));

  // 매물 파생 일정(그 달) + 연결용 옵션
  const props = await db.property.findMany({
    where: { userId: user.id },
    select: {
      id: true, name: true, complexName: true,
      contractHopeDate: true, contractDate: true, interim1Date: true, interim2Date: true,
      balanceDate: true, moveInHopeDate: true, moveInDate: true, leaseEndDate: true,
    },
  });
  const propertyDates = propertyCalendarEvents(props).filter((e) => e.date.startsWith(prefix));
  const properties: CalendarOption[] = props.map((p) => ({ id: p.id, label: p.name ?? p.complexName ?? "매물" }));
  const customerRows = await db.customer.findMany({ where: { userId: user.id }, select: { id: true, name: true, phone: true } });
  const customers: CalendarOption[] = customerRows.map((c) => ({ id: c.id, label: c.phone ? `${c.name} (${c.phone})` : c.name }));

  return { events, propertyDates, properties, customers };
}

export async function createEvent(input: EventInput): Promise<string> {
  const user = await requireUser();
  const data = toData(input);
  if (!data.title || data.date.length !== 8) throw new Error("제목과 날짜는 필수입니다");
  const propertyId = await ownedId("property", user.id, input.propertyId);
  const customerId = await ownedId("customer", user.id, input.customerId);
  const e = await db.event.create({ data: { ...data, userId: user.id, propertyId, customerId } });
  revalidatePath("/calendar");
  return e.id;
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const user = await requireUser();
  const data = toData(input);
  if (!data.title || data.date.length !== 8) throw new Error("제목과 날짜는 필수입니다");
  const propertyId = await ownedId("property", user.id, input.propertyId);
  const customerId = await ownedId("customer", user.id, input.customerId);
  await db.event.updateMany({ where: { id, userId: user.id }, data: { ...data, propertyId, customerId } });
  revalidatePath("/calendar");
}

export async function deleteEvent(id: string): Promise<void> {
  const user = await requireUser();
  await db.event.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/calendar");
}
