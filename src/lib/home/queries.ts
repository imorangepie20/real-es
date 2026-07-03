import type { User } from "@prisma/client";

import { db } from "@/lib/db";
import type { RealTxRecord } from "@/lib/realprice/types";

export type HomeData = {
  user: { name: string | null; email: string; address: string | null };
  propertyStats: { total: number; favorites: number; inProgress: number; contracted: number };
  todayEvents: {
    id: string;
    title: string;
    startTime: string | null;
    category: string;
    propertyId: string | null;
  }[];
  recentProperties: {
    id: string;
    name: string | null;
    complexName: string | null;
    status: string;
    createdAt: Date;
  }[];
  customerCount: number;
  region: { lawdCd: string; naverCode: string | null } | null;
  realpriceSummary: { count: number; avgPrice: number | null } | null;
  naverSummary: { articleCount: number } | null;
};

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// n개월 전의 YYYYMM(월 단위 실거래 캐시 비교용).
function ymMonthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - (n - 1));
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 본인 요약(매물·일정·최근 매물·고객) + 주소 기반 요약(실거래/네이버 캐시).
// 라이브 수집 X — 캐시된 데이터만. 주소 매핑이 없거나 데이터가 없으면 해당 카드 생략(null).
export async function getHomeData(user: User): Promise<HomeData> {
  const [total, favorites, inProgress, contracted, customerCount] = await Promise.all([
    db.property.count({ where: { userId: user.id } }),
    db.property.count({ where: { userId: user.id, isFavorite: true } }),
    db.property.count({ where: { userId: user.id, status: "계약진행" } }),
    db.property.count({ where: { userId: user.id, status: "계약완료" } }),
    db.customer.count({ where: { userId: user.id } }),
  ]);

  const [todayEvents, recentProperties] = await Promise.all([
    db.event.findMany({
      where: { userId: user.id, date: todayYmd() },
      orderBy: { startTime: "asc" },
      take: 5,
      select: { id: true, title: true, startTime: true, category: true, propertyId: true },
    }),
    db.property.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, complexName: true, status: true, createdAt: true },
    }),
  ]);

  // 주소 기반 요약 — 캐시만(라이브 수집 X).
  let realpriceSummary: { count: number; avgPrice: number | null } | null = null;
  let naverSummary: { articleCount: number } | null = null;

  if (user.homeLawdCd) {
    const caches = await db.realTxCache.findMany({
      where: { lawdCd: user.homeLawdCd, dealYmd: { gte: ymMonthsAgo(3) } },
      select: { records: true },
    });
    let count = 0;
    let sum = 0;
    for (const c of caches) {
      const records = c.records as unknown as RealTxRecord[];
      for (const r of records) {
        if (r.isCanceled) continue;
        const p = r.kind === "sale" ? r.dealAmount : r.deposit;
        if (p != null) {
          count++;
          sum += p;
        }
      }
    }
    realpriceSummary = { count, avgPrice: count ? Math.round(sum / count) : null };
  }

  if (user.homeNaverCode) {
    const articleCount = await db.article.count({
      where: { regionCode: user.homeNaverCode },
    });
    naverSummary = { articleCount };
  }

  return {
    user: { name: user.name, email: user.email, address: user.address },
    propertyStats: { total, favorites, inProgress, contracted },
    todayEvents,
    recentProperties,
    customerCount,
    region: user.homeLawdCd
      ? { lawdCd: user.homeLawdCd, naverCode: user.homeNaverCode ?? null }
      : null,
    realpriceSummary,
    naverSummary,
  };
}
