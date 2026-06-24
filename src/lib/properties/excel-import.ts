// 매핑 확정 → import 행 빌드 / 형식 불일치 카운트. exceljs 미포함(클라 번들 안전).
import { coerceField, FIELD_BY_KEY } from "./fields";
import type { HeaderMatch } from "./header-match";

export type ParsedSheet = { headers: string[]; matches: HeaderMatch[]; rows: (string | null)[][] };

function active(mapping: Record<number, string | null>) {
  return Object.entries(mapping)
    .filter(([, k]) => k)
    .map(([i, k]) => ({ index: Number(i), key: k as string }));
}

export function buildImportRows(parsed: ParsedSheet, mapping: Record<number, string | null>): Record<string, unknown>[] {
  const cols = active(mapping);
  return parsed.rows.map((cells) => {
    const obj: Record<string, unknown> = {};
    for (const { index, key } of cols) {
      const f = FIELD_BY_KEY[key];
      if (!f) continue;
      obj[key] = coerceField(f.type, cells[index]);
    }
    return obj;
  });
}

// 숫자형(number/money/area)인데 비어있지 않은 값이 파싱 실패 → 형식 불일치 셀 수
export function countIssues(parsed: ParsedSheet, mapping: Record<number, string | null>): number {
  const cols = active(mapping);
  let n = 0;
  for (const cells of parsed.rows) {
    for (const { index, key } of cols) {
      const f = FIELD_BY_KEY[key];
      if (!f) continue;
      const orig = cells[index];
      if (orig != null && (f.type === "number" || f.type === "money" || f.type === "area") && coerceField(f.type, orig) == null) n++;
    }
  }
  return n;
}
