import { PROPERTY_FIELDS } from "@/lib/properties/fields";
import type { PropertyRow } from "./actions";

// Prisma Property → 직렬화 가능한 PropertyRow (BigInt→string)
export function toRow(p: Record<string, unknown>): PropertyRow {
  const row: PropertyRow = { id: p.id as string, isFavorite: !!p.isFavorite };
  for (const f of PROPERTY_FIELDS) {
    const v = p[f.key];
    row[f.key] = typeof v === "bigint" ? v.toString() : ((v as string | number | boolean | null | undefined) ?? null);
  }
  return row;
}
