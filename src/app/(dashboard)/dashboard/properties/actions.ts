"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { PROPERTY_FIELDS, FIELD_BY_KEY } from "@/lib/properties/fields";
import { ownerRoleFromTrade } from "@/lib/properties/party-role";
import { parseWorkbook } from "@/lib/properties/excel-read";
import type { ParsedSheet } from "@/lib/properties/excel-import";
import { toRow } from "./row-utils";

export type PropertyView = "all" | "favorites" | "in-progress" | "contracted";
export type PropertyRow = { id: string; isFavorite: boolean } & Record<string, string | number | boolean | null>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다");
  return user;
}

const MONEY = new Set(PROPERTY_FIELDS.filter((f) => f.type === "money").map((f) => f.key));
const INT = new Set(PROPERTY_FIELDS.filter((f) => f.type === "number").map((f) => f.key));
const FLOAT = new Set(PROPERTY_FIELDS.filter((f) => f.type === "area").map((f) => f.key));
const BOOL = new Set(PROPERTY_FIELDS.filter((f) => f.type === "bool").map((f) => f.key));

// PropertyRow patch → Prisma data (문자열→BigInt/Int/Float/Bool). 알 수 없는 키 무시.
function toData(patch: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!FIELD_BY_KEY[k]) continue;
    if (v == null || v === "") { data[k] = null; continue; }
    if (MONEY.has(k)) data[k] = BigInt(Math.trunc(Number(v) * 10000)); // 만원 입력 → 원 저장
    else if (INT.has(k)) data[k] = Math.trunc(Number(v));
    else if (FLOAT.has(k)) data[k] = Number(v);
    else if (BOOL.has(k)) data[k] = v === true || v === "true";
    else data[k] = String(v);
  }
  return data;
}

export async function listProperties(view: PropertyView = "all"): Promise<PropertyRow[]> {
  const user = await requireUser();
  const where: { userId: string; isFavorite?: boolean; status?: string } = { userId: user.id };
  if (view === "favorites") where.isFavorite = true;
  if (view === "in-progress") where.status = "계약진행";
  if (view === "contracted") where.status = "계약완료";
  const rows = await db.property.findMany({ where, orderBy: { createdAt: "desc" } });
  // 고객 구분키 = 이름 + 전화(숫자만). 매물의 고객이 고객관리에 등록됐는지 판정(고객명 옆 미등록 표시용).
  const custKey = (name?: string | null, phone?: string | null) => `${(name ?? "").trim()}|${String(phone ?? "").replace(/\D/g, "")}`;
  const customers = await db.customer.findMany({ where: { userId: user.id }, select: { name: true, phone: true } });
  const registered = new Set(customers.map((c) => custKey(c.name, c.phone)));
  return rows.map((r) => ({ ...toRow(r as unknown as Record<string, unknown>), customerRegistered: registered.has(custKey(r.customerName, r.customerPhone)) }));
}

export async function getProperty(id: string): Promise<PropertyRow | null> {
  const user = await requireUser();
  const p = await db.property.findFirst({ where: { id, userId: user.id } });
  return p ? toRow(p as unknown as Record<string, unknown>) : null;
}

export async function createProperty(input: Record<string, unknown>): Promise<string> {
  const user = await requireUser();
  const data = toData(input);
  if (data.status == null) delete data.status; // status는 NOT NULL DEFAULT '진행' — 빈 값이면 생략해 기본값 적용
  const p = await db.property.create({ data: { ...data, userId: user.id, source: (data.source as string) || "수기" } });
  revalidatePath("/dashboard/properties");
  return p.id;
}

export async function updateProperty(id: string, patch: Record<string, unknown>): Promise<void> {
  const user = await requireUser();
  const data = toData(patch);
  if ("status" in data && data.status == null) delete data.status; // status는 NOT NULL — 빈 값으로 덮어쓰지 않음
  await db.property.updateMany({ where: { id, userId: user.id }, data });
  revalidatePath("/dashboard/properties");
}

export async function deleteProperties(ids: string[]): Promise<number> {
  const user = await requireUser();
  const res = await db.property.deleteMany({ where: { id: { in: ids }, userId: user.id } });
  revalidatePath("/dashboard/properties");
  return res.count;
}

export async function togglePropertyFavorite(id: string, isFavorite: boolean): Promise<void> {
  const user = await requireUser();
  await db.property.updateMany({ where: { id, userId: user.id }, data: { isFavorite } });
  revalidatePath("/dashboard/properties");
}

export async function importProperties(rows: Record<string, unknown>[]): Promise<number> {
  const user = await requireUser();
  // 고객 구분키 = 이름 + 전화(숫자만). 같은 사람(이름+전화)은 고객 1명으로, 매물마다 PropertyParty로 연결.
  const custKey = (name?: string | null, phone?: string | null) => `${(name ?? "").trim()}|${String(phone ?? "").replace(/\D/g, "")}`;
  const existing = await db.customer.findMany({ where: { userId: user.id }, select: { id: true, name: true, phone: true } });
  const idByKey = new Map(existing.map((c) => [custKey(c.name, c.phone), c.id]));
  let n = 0;
  for (const r of rows) {
    const data = toData(r);
    if (Object.keys(data).length === 0) continue;
    const p = await db.property.create({ data: { ...data, userId: user.id, source: "엑셀" } });
    n++;
    // 고객명이 있으면 고객 find-or-create 후 매물에 당사자(역할=거래유형 기준)로 연결.
    const name = (data.customerName as string | null)?.trim();
    if (name) {
      const role = ownerRoleFromTrade(data.tradeType as string | null);
      const key = custKey(name, data.customerPhone as string | null);
      let customerId = idByKey.get(key);
      if (!customerId) {
        const c = await db.customer.create({
          data: { userId: user.id, name, phone: (data.customerPhone as string | null) || null, types: [role] },
        });
        customerId = c.id;
        idByKey.set(key, customerId);
      }
      await db.propertyParty.create({ data: { propertyId: p.id, customerId, role } });
    }
  }
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard/customers");
  return n;
}

export async function analyzeWorkbook(formData: FormData): Promise<ParsedSheet> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("엑셀 파일을 선택하세요");
  const buf = await file.arrayBuffer();
  return parseWorkbook(buf);
}
