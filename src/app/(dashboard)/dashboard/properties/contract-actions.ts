"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { FIELD_BY_KEY } from "@/lib/properties/fields";
import {
  resolveChecklist,
  requiredFieldKeys,
  contractProgress,
  type ChecklistItem,
} from "@/lib/properties/contract-checklist";
import { requireUser, type PropertyRow } from "./actions";
import { toRow } from "./row-utils";

export type ContractData = {
  property: PropertyRow;
  checklist: ChecklistItem[];
  checked: Record<string, string>;
  requiredFields: { key: string; label: string; filled: boolean }[];
  progress: { done: number; total: number; complete: boolean };
  status: string;
};

const checkedMap = (v: unknown): Record<string, string> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};

export async function getContractData(id: string): Promise<ContractData | null> {
  const user = await requireUser();
  const p = await db.property.findFirst({ where: { id, userId: user.id } });
  if (!p) return null;
  const property = toRow(p as unknown as Record<string, unknown>);
  const g = (property.realEstateType as string) ?? "";
  const t = (property.tradeType as string) ?? "";
  const checked = checkedMap((p as unknown as Record<string, unknown>).contractChecklist);
  const checklist = resolveChecklist(g, t);
  const requiredFields = requiredFieldKeys(t).map((key) => ({
    key,
    label: FIELD_BY_KEY[key]?.label ?? key,
    filled: property[key] != null && property[key] !== "",
  }));
  const progress = contractProgress(g, t, checked, property as Record<string, unknown>);
  return { property, checklist, checked, requiredFields, progress, status: (property.status as string) ?? "진행" };
}

export async function toggleChecklistItem(id: string, itemId: string, checked: boolean): Promise<void> {
  const user = await requireUser();
  const p = await db.property.findFirst({ where: { id, userId: user.id } });
  if (!p) throw new Error("매물을 찾을 수 없습니다");
  const g = (p as unknown as { realEstateType: string | null }).realEstateType ?? "";
  const t = (p as unknown as { tradeType: string | null }).tradeType ?? "";
  if (!resolveChecklist(g, t).some((i) => i.id === itemId)) throw new Error("유효하지 않은 항목입니다");
  const cur = checkedMap((p as unknown as Record<string, unknown>).contractChecklist);
  if (checked) cur[itemId] = new Date().toISOString();
  else delete cur[itemId];
  await db.property.updateMany({ where: { id, userId: user.id }, data: { contractChecklist: cur } });
  revalidatePath(`/dashboard/properties/${id}/contract`);
}

export async function startContract(id: string): Promise<void> {
  const user = await requireUser();
  await db.property.updateMany({ where: { id, userId: user.id, status: "진행" }, data: { status: "계약진행" } });
  revalidatePath("/dashboard/properties");
}

export async function completeContract(id: string): Promise<void> {
  const user = await requireUser();
  const p = await db.property.findFirst({ where: { id, userId: user.id } });
  if (!p) throw new Error("매물을 찾을 수 없습니다");
  const property = toRow(p as unknown as Record<string, unknown>);
  const checked = checkedMap((p as unknown as Record<string, unknown>).contractChecklist);
  const prog = contractProgress(
    (property.realEstateType as string) ?? "",
    (property.tradeType as string) ?? "",
    checked,
    property as Record<string, unknown>,
  );
  if (!prog.complete) throw new Error("필수 항목·데이터가 모두 충족되지 않았습니다");
  await db.property.updateMany({ where: { id, userId: user.id }, data: { status: "계약완료" } });
  revalidatePath("/dashboard/properties");
}
