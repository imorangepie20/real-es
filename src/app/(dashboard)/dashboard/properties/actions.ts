"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { PROPERTY_FIELDS, FIELD_BY_KEY } from "@/lib/properties/fields";
import { parseWorkbook } from "@/lib/properties/excel-read";
import type { ParsedSheet } from "@/lib/properties/excel-import";

export type PropertyView = "all" | "favorites" | "contracted";
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

// Prisma Property → 직렬화 가능한 PropertyRow (BigInt→string)
export function toRow(p: Record<string, unknown>): PropertyRow {
  const row: PropertyRow = { id: p.id as string, isFavorite: !!p.isFavorite };
  for (const f of PROPERTY_FIELDS) {
    const v = p[f.key];
    row[f.key] = typeof v === "bigint" ? v.toString() : ((v as string | number | boolean | null | undefined) ?? null);
  }
  return row;
}

// PropertyRow patch → Prisma data (문자열→BigInt/Int/Float/Bool). 알 수 없는 키 무시.
function toData(patch: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!FIELD_BY_KEY[k]) continue;
    if (v == null || v === "") { data[k] = null; continue; }
    if (MONEY.has(k)) data[k] = BigInt(Math.trunc(Number(v)));
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
  if (view === "contracted") where.status = "계약완료";
  const rows = await db.property.findMany({ where, orderBy: { createdAt: "desc" } });
  return rows.map((r) => toRow(r as unknown as Record<string, unknown>));
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

export async function setPropertyStatus(ids: string[], status: string): Promise<number> {
  const user = await requireUser();
  const res = await db.property.updateMany({ where: { id: { in: ids }, userId: user.id }, data: { status } });
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
  let n = 0;
  for (const r of rows) {
    const data = toData(r);
    if (Object.keys(data).length === 0) continue;
    await db.property.create({ data: { ...data, userId: user.id, source: "엑셀" } });
    n++;
  }
  revalidatePath("/dashboard/properties");
  return n;
}

export async function analyzeWorkbook(formData: FormData): Promise<ParsedSheet> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("엑셀 파일을 선택하세요");
  const buf = await file.arrayBuffer();
  return parseWorkbook(buf);
}
