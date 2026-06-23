// 네이버 수집 스크래퍼 — 공개 인터페이스. 내부(Playwright·인터셉트·파싱·캐싱)는 은닉. (스펙 §3 원칙 1)
//   listComplexesByRegion(eupLegalDivisionNumber) — 동 → 단지 목록
//   getComplexArticles(complexNumber, opts)        — 단지 → 매물 목록
import { setTimeout as sleep } from "node:timers/promises";

import { fetchArticles, fetchRegionComplexes, withNaverSession } from "./fetch";
import { parseArticles, parseRegionComplexes } from "./parse";
import { upsertArticles, upsertComplexes } from "./cache";
import type { NaverArticle, NaverComplex } from "./types";

/** 동(법정동 코드) → 단지 목록 수집 + 캐시 */
export async function listComplexesByRegion(
  eupLegalDivisionNumber: string,
  { size = 30, page = 0 }: { size?: number; page?: number } = {},
): Promise<NaverComplex[]> {
  return withNaverSession(async (ctx) => {
    const json = await fetchRegionComplexes(ctx, eupLegalDivisionNumber, { size, page });
    const { complexes } = parseRegionComplexes(json);
    await upsertComplexes(complexes, eupLegalDivisionNumber);
    return complexes;
  });
}

/** 단지번호 → 매물 목록 수집 + 캐시 (커서 페이지네이션, 보수적 페이싱) */
export async function getComplexArticles(
  complexNumber: string,
  { tradeTypes = ["A1"], size = 30, maxPages = 5 }: { tradeTypes?: string[]; size?: number; maxPages?: number } = {},
): Promise<NaverArticle[]> {
  return withNaverSession(async (ctx) => {
    const all: NaverArticle[] = [];
    let lastInfo: unknown[] = [];
    for (let p = 0; p < maxPages; p++) {
      const json = await fetchArticles(ctx, complexNumber, { tradeTypes, size, lastInfo });
      const { articles, lastInfo: next, hasNextPage } = parseArticles(json, complexNumber);
      all.push(...articles);
      if (!hasNextPage || !next.length) break;
      lastInfo = next;
      await sleep(2500); // 요청 간 지연 (스펙 §6)
    }
    await upsertArticles(complexNumber, all);
    return all;
  });
}

export type { NaverArticle, NaverComplex } from "./types";
