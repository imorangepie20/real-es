// 네이버 front-api 수집 (헤드리스 워밍 세션 + context.request). 서버/콘솔 전용.
import { setTimeout as sleep } from "node:timers/promises";
import { chromium, type APIResponse, type BrowserContext } from "playwright";

import { DEFAULT_TRADE } from "./trade-types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const BASE = "https://fin.land.naver.com/front-api/v1";
const REFERER = "https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01-A02";
const WARM_URL = "https://fin.land.naver.com/";

// 브라우저 동일 헤더 — 이게 없으면 네이버가 TOO_MANY_REQUESTS(429)로 거부한다(레이트리밋 아님).
const BROWSER_HEADERS: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7",
  priority: "u=1, i",
  "sec-ch-ua": '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  referer: REFERER,
};

/**
 * 헤드리스 브라우저로 Akamai 쿠키만 워밍한 뒤 컨텍스트로 작업 수행 (스펙 §6: 단일 세션 재사용).
 * 워밍 중 front-api 요청은 전부 abort — 단지상세 페이지를 로드하면 front-api를 수십 개 쏴서
 * 레이트리밋(429)을 유발하므로, Akamai 쿠키(HTML·센서로 세팅)만 얻고 실제 수집 호출만 남긴다.
 */
export async function withNaverSession<T>(fn: (ctx: BrowserContext) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: UA,
      locale: "ko-KR",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.route("**/front-api/**", (route) => route.abort());
    await page.goto(WARM_URL, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
    await sleep(2000);
    await page.unroute("**/front-api/**");
    return await fn(context);
  } finally {
    await browser.close();
  }
}

/** 429/403/5xx 시 지수 백오프 재시도 (스펙 §6) */
async function request(label: string, doReq: () => Promise<APIResponse>, retries = 3): Promise<unknown> {
  let delay = 3000;
  for (let attempt = 0; ; attempt++) {
    const res = await doReq();
    const status = res.status();
    if (status === 200) return res.json();
    if ((status === 429 || status === 403 || status >= 500) && attempt < retries) {
      await sleep(delay);
      delay *= 2;
      continue;
    }
    const body = await res.text().catch(() => "");
    throw new Error(`naver ${label} ${status}: ${body.slice(0, 200)}`);
  }
}

/** 동(법정동 코드) → 단지 목록 원본 JSON */
export function fetchRegionComplexes(
  ctx: BrowserContext,
  eupLegalDivisionNumber: string,
  { page = 0, size = 30 }: { page?: number; size?: number } = {},
): Promise<unknown> {
  const url = `${BASE}/complex/region?eupLegalDivisionNumber=${eupLegalDivisionNumber}&size=${size}&sortType=HOUSEHOLD&page=${page}`;
  return request("complex/region", () => ctx.request.get(url, { headers: BROWSER_HEADERS }));
}

/** 단지번호 → 매물 목록 원본 JSON (POST) */
export function fetchArticles(
  ctx: BrowserContext,
  complexNumber: string,
  { tradeTypes = [DEFAULT_TRADE], size = 30, lastInfo = [] as unknown[] }: { tradeTypes?: string[]; size?: number; lastInfo?: unknown[] } = {},
): Promise<unknown> {
  return request("article/list", () =>
    ctx.request.post(`${BASE}/complex/article/list`, {
      headers: { ...BROWSER_HEADERS, "content-type": "application/json" },
      data: { size, complexNumber, tradeTypes, pyeongTypes: [], dongNumbers: [], userChannelType: "PC", articleSortType: "RANKING_DESC", lastInfo },
    }),
  );
}
