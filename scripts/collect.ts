// 콘솔 수집 러너 (스테이지 2 deliverable: 동 → 단지 → 매물)
// 사용: pnpm collect <eupLegalDivisionNumber> [complexNumber] [tradeType=A1]
//   예:  pnpm collect 4111113000            (정자동 단지 목록)
//        pnpm collect 4111113000 102614 A1  (단지 102614 매매 매물)
import "dotenv/config";

import { getComplexArticles, listComplexesByRegion } from "@/lib/naver";
import { DEFAULT_TRADE } from "@/lib/naver/trade-types";

const won = (v: number | null) => (v == null ? "-" : v.toLocaleString("ko-KR"));

async function main() {
  const [, , regionCode, complexNumber, tradeType = DEFAULT_TRADE] = process.argv;
  if (!regionCode) {
    console.error("사용: pnpm collect <eupLegalDivisionNumber> [complexNumber] [tradeType=A1]");
    process.exit(1);
  }

  console.log(`[동 ${regionCode}] 단지 수집...`);
  const complexes = await listComplexesByRegion(regionCode);
  console.log(`단지 ${complexes.length}개`);
  for (const c of complexes.slice(0, 10)) {
    console.log(`  ${c.complexNumber} ${c.name} (세대 ${c.totalHouseholds ?? "-"}, 매매 ${c.dealCount}/전세 ${c.leaseDepositCount}/월세 ${c.leaseMonthlyCount})`);
  }

  const target = complexNumber ?? complexes[0]?.complexNumber;
  if (target) {
    console.log(`\n[단지 ${target}] 매물 수집 (${tradeType})...`);
    const articles = await getComplexArticles(target, { tradeTypes: [tradeType] });
    console.log(`매물 ${articles.length}개`);
    for (const a of articles.slice(0, 15)) {
      console.log(`  ${a.articleNumber} ${a.tradeType} ${won(a.price)}원 전용${a.areaExclusive ?? "-"} ${a.floor ?? "-"} ${a.realtorName ?? "-"}`);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
