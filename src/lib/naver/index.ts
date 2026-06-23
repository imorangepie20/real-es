// 네이버 수집 스크래퍼 — 공개 인터페이스.
//   listComplexesByRegion(naverCode, opts) — 동 + 매물유형 → 단지 목록 (단지형)
//   getRegionArticles(naverCode, opts)      — 동 + 매물유형 → 매물 목록 (비단지형)
//   getComplexArticles(complexNumber, opts) — 단지 → 매물 목록
import { setTimeout as sleep } from "node:timers/promises";

import { fetchArticles, fetchBoundedArticles, fetchBoundedComplexes, withNaverSession } from "./fetch";
import { parseArticles, parseBoundedComplexes } from "./parse";
import { getRegionCenter, upsertComplexArticles, upsertComplexes, upsertRegionArticles } from "./cache";
import type { NaverArticle, NaverComplex } from "./types";

type RegionOpts = { realEstateTypes: string[]; tradeTypes?: string[]; maxPages?: number };

/** 동 + 매물유형 → 단지 목록 수집 + 캐시 (단지형) */
export async function listComplexesByRegion(
  naverCode: string,
  { realEstateTypes, tradeTypes = [], maxPages = 10 }: RegionOpts,
): Promise<NaverComplex[]> {
  const center = await getRegionCenter(naverCode);
  return withNaverSession(async (ctx) => {
    const all: NaverComplex[] = [];
    let lastInfo: unknown[] = [];
    for (let p = 0; p < maxPages; p++) {
      const json = await fetchBoundedComplexes(ctx, naverCode, { realEstateTypes, tradeTypes, center, lastInfo });
      const { complexes, lastInfo: next, hasNextPage } = parseBoundedComplexes(json);
      all.push(...complexes);
      if (!hasNextPage || !next.length) break;
      lastInfo = next;
      await sleep(2500);
    }
    await upsertComplexes(all, naverCode);
    return all;
  });
}

/** 동 + 매물유형 → 매물 목록 직접 수집 + 캐시 (비단지형) */
export async function getRegionArticles(
  naverCode: string,
  { realEstateTypes, tradeTypes = [], maxPages = 20 }: RegionOpts,
): Promise<NaverArticle[]> {
  const center = await getRegionCenter(naverCode);
  return withNaverSession(async (ctx) => {
    const all: NaverArticle[] = [];
    let lastInfo: unknown[] = [];
    for (let p = 0; p < maxPages; p++) {
      const json = await fetchBoundedArticles(ctx, naverCode, { realEstateTypes, tradeTypes, center, lastInfo });
      const { articles, lastInfo: next, hasNextPage } = parseArticles(json, "");
      all.push(...articles);
      if (!hasNextPage || !next.length) break;
      lastInfo = next;
      await sleep(2500);
    }
    await upsertRegionArticles(naverCode, all);
    return all;
  });
}

/** 단지번호 → 매물 목록 수집 + 캐시 (커서 페이지네이션, 보수적 페이싱) */
export async function getComplexArticles(
  complexNumber: string,
  { tradeTypes = [], size = 30, maxPages = 5 }: { tradeTypes?: string[]; size?: number; maxPages?: number } = {},
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
      await sleep(2500);
    }
    await upsertComplexArticles(complexNumber, all);
    return all;
  });
}

export type { NaverArticle, NaverComplex } from "./types";
