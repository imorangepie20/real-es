"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { PARTY_TYPES } from "@/lib/customers/types";

export type PartyRow = { id: string; customerId: string; name: string; phone: string | null; role: string };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다");
  return user;
}

async function requireOwnedProperty(userId: string, propertyId: string) {
  const p = await db.property.findFirst({ where: { id: propertyId, userId }, select: { id: true } });
  if (!p) throw new Error("매물을 찾을 수 없습니다");
}

export async function listParties(propertyId: string): Promise<PartyRow[]> {
  const user = await requireUser();
  await requireOwnedProperty(user.id, propertyId);
  const rows = await db.propertyParty.findMany({
    where: { propertyId, property: { userId: user.id } },
    include: { customer: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({ id: r.id, customerId: r.customerId, name: r.customer.name, phone: r.customer.phone, role: r.role }));
}

// 매물에 당사자 추가. 이름+전화로 기존 고객을 찾으면 재사용, 없으면 생성. (같은 사람 = 고객 1명)
export async function addParty(propertyId: string, role: string, name: string, phone: string): Promise<void> {
  const user = await requireUser();
  await requireOwnedProperty(user.id, propertyId);
  if (!(PARTY_TYPES as readonly string[]).includes(role)) throw new Error("역할을 선택하세요");
  const nm = name.trim();
  if (!nm) throw new Error("고객 이름을 입력하세요");
  const ph = phone.trim() || null;

  const custKey = (n?: string | null, p?: string | null) => `${(n ?? "").trim()}|${String(p ?? "").replace(/\D/g, "")}`;
  const customers = await db.customer.findMany({ where: { userId: user.id }, select: { id: true, name: true, phone: true } });
  const match = customers.find((c) => custKey(c.name, c.phone) === custKey(nm, ph));
  const customerId = match?.id ?? (await db.customer.create({ data: { userId: user.id, name: nm, phone: ph, types: [role] } })).id;

  await db.propertyParty.upsert({
    where: { propertyId_customerId_role: { propertyId, customerId, role } },
    create: { propertyId, customerId, role },
    update: {},
  });
  revalidatePath(`/properties/${propertyId}/edit`);
  revalidatePath("/customers");
}

export async function removeParty(partyId: string): Promise<void> {
  const user = await requireUser();
  const party = await db.propertyParty.findFirst({
    where: { id: partyId, property: { userId: user.id } },
    select: { id: true, propertyId: true },
  });
  if (!party) throw new Error("당사자를 찾을 수 없습니다");
  await db.propertyParty.delete({ where: { id: party.id } });
  revalidatePath(`/properties/${party.propertyId}/edit`);
  revalidatePath("/customers");
}
