// 네이버 front-api 수집 (헤드리스 워밍 세션 + context.request). 서버/콘솔 전용.
// 라이브 검증은 IP 레이트리밋 쿨다운 후. 접근법은 spike로 검증됨(429=API 도달).
import { setTimeout as sleep } from "node:timers/promises";
import { chromium, type APIResponse, type BrowserContext } from "playwright";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const BASE = "https://fin.land.naver.com/front-api/v1";
const REFERER = "https://fin.land.naver.com/map";
const WARM_URL = "https://fin.land.naver.com/complexes/102614";

/** 헤드리스 브라우저를 띄워 Akamai 쿠키를 워밍한 뒤 컨텍스트로 작업 수행 (스펙 §6: 단일 세션 재사용) */
export async function withNaverSession<T>(fn: (ctx: BrowserContext) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: UA,
      locale: "ko-KR",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(WARM_URL, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => {});
    await sleep(2000);
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
  return request("complex/region", () =>
    ctx.request.get(url, { headers: { accept: "application/json, text/plain, */*", referer: REFERER } }),
  );
}

/** 단지번호 → 매물 목록 원본 JSON (POST) */
export function fetchArticles(
  ctx: BrowserContext,
  complexNumber: string,
  { tradeTypes = ["A1"], size = 30, lastInfo = [] as unknown[] }: { tradeTypes?: string[]; size?: number; lastInfo?: unknown[] } = {},
): Promise<unknown> {
  return request("article/list", () =>
    ctx.request.post(`${BASE}/complex/article/list`, {
      headers: { accept: "application/json, text/plain, */*", "content-type": "application/json", referer: REFERER },
      data: { size, complexNumber, tradeTypes, pyeongTypes: [], dongNumbers: [], userChannelType: "PC", articleSortType: "RANKING_DESC", lastInfo },
    }),
  );
}
