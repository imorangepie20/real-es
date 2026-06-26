"use server";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { normalizeCustomerTypes, GENDERS } from "@/lib/customers/types";

export type CustomerInput = {
  name: string; zipcode?: string | null; phone?: string | null; address?: string | null; email?: string | null;
  gender?: string | null; memo?: string | null; types?: string[]; propertyId?: string | null;
};
export type CustomerRow = {
  id: string; types: string[]; name: string; zipcode: string | null; phone: string | null; address: string | null;
  email: string | null; gender: string | null; memo: string | null;
  propertyId: string | null; propertyName: string | null; updatedAt: string;
};

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다");
  return user;
}

const cleanGender = (g?: string | null): string | null =>
  g && (GENDERS as readonly string[]).includes(g) ? g : null;

function toData(input: CustomerInput) {
  return {
    name: (input.name ?? "").trim(),
    zipcode: input.zipcode?.trim() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    email: input.email?.trim() || null,
    gender: cleanGender(input.gender),
    memo: input.memo?.trim() || null,
    types: normalizeCustomerTypes(input.types ?? []),
  };
}

async function ownedPropertyId(userId: string, propertyId?: string | null): Promise<string | null> {
  if (!propertyId) return null;
  const p = await db.property.findFirst({ where: { id: propertyId, userId }, select: { id: true } });
  return p ? p.id : null;
}

const toRow = (r: {
  id: string; types: string[]; name: string; zipcode: string | null; phone: string | null; address: string | null;
  email: string | null; gender: string | null; memo: string | null; propertyId: string | null;
  updatedAt: Date; property?: { name: string | null; complexName: string | null } | null;
}): CustomerRow => ({
  id: r.id, types: r.types, name: r.name, zipcode: r.zipcode, phone: r.phone, address: r.address, email: r.email,
  gender: r.gender, memo: r.memo, propertyId: r.propertyId,
  propertyName: r.property?.name ?? r.property?.complexName ?? null,
  updatedAt: r.updatedAt.toISOString().slice(0, 10),
});

export async function listCustomers(opts?: { q?: string; type?: string }): Promise<CustomerRow[]> {
  const user = await requireUser();
  const q = opts?.q?.trim();
  const rows = await db.customer.findMany({
    where: {
      userId: user.id,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
      ...(opts?.type ? { types: { has: opts.type } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { property: { select: { name: true, complexName: true } } },
  });
  return rows.map(toRow);
}

export async function getCustomer(id: string): Promise<CustomerRow | null> {
  const user = await requireUser();
  const r = await db.customer.findFirst({
    where: { id, userId: user.id },
    include: { property: { select: { name: true, complexName: true } } },
  });
  return r ? toRow(r) : null;
}

export async function createCustomer(input: CustomerInput): Promise<string> {
  const user = await requireUser();
  const data = toData(input);
  if (!data.name) throw new Error("이름은 필수입니다");
  const propertyId = await ownedPropertyId(user.id, input.propertyId);
  const c = await db.customer.create({ data: { ...data, userId: user.id, propertyId } });
  revalidatePath("/dashboard/customers");
  return c.id;
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<void> {
  const user = await requireUser();
  const data = toData(input);
  if (!data.name) throw new Error("이름은 필수입니다");
  const propertyId = await ownedPropertyId(user.id, input.propertyId);
  await db.customer.updateMany({ where: { id, userId: user.id }, data: { ...data, propertyId } });
  revalidatePath("/dashboard/customers");
}

export async function deleteCustomer(id: string): Promise<void> {
  const user = await requireUser();
  await db.customer.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/customers");
}

// 매물에서 추출: 매물(userId 스코프)의 고객명·전화로 신규 폼 초기값.
export async function customerDraftFromProperty(
  propertyId: string,
): Promise<{ name: string; phone: string; propertyId: string; propertyLabel: string } | null> {
  const user = await requireUser();
  const p = await db.property.findFirst({
    where: { id: propertyId, userId: user.id },
    select: { id: true, name: true, complexName: true, customerName: true, customerPhone: true },
  });
  if (!p) return null;
  return { name: p.customerName ?? "", phone: p.customerPhone ?? "", propertyId: p.id, propertyLabel: p.name ?? p.complexName ?? "매물" };
}
