import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowRight, MapPin, CalendarDays, Building2, Users, TrendingUp } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsPanel } from "@/app/(dashboard)/realprice/stats-panel";
import type { HomeData } from "@/lib/home/queries";

// 원(정수) → 억/만 표기.
function won억(v: number | null): string {
  if (v == null) return "-";
  const 억 = Math.floor(v / 1e8);
  const 만 = Math.round((v % 1e8) / 1e4);
  return 억 > 0 ? `${억}억${만 > 0 ? ` ${만.toLocaleString("ko-KR")}만` : ""}` : `${만.toLocaleString("ko-KR")}만`;
}

// YYYYMMDD → YY.MM.DD
function dealDateFmt(s: string): string {
  return s.length === 8 ? `${s.slice(2, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : s;
}

const EVENT_LABEL: Record<string, string> = {
  미팅: "미팅",
  임장: "임장",
  계약: "계약",
  기타: "기타",
};

export function HomeView({ data }: { data: HomeData }) {
  const {
    user,
    propertyStats: s,
    todayEvents,
    recentProperties,
    customerCount,
    region,
    realpriceSummary,
    naverSummary,
  } = data;
  const name = user.name ?? "회원";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{name}님, 반갑습니다</h1>
        <p className="text-sm text-muted-foreground">오늘의 업무 요약을 확인하세요.</p>
      </div>

      {/* 매물 KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard href="/properties" label="전체 매물" value={s.total} />
        <StatCard href="/properties/favorites" label="관심 매물" value={s.favorites} />
        <StatCard href="/properties/progress" label="계약 진행" value={s.inProgress} />
        <StatCard href="/properties/contracted" label="계약 완료" value={s.contracted} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 오늘 일정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4" /> 오늘 일정
            </CardTitle>
            <CardAction>
              <Link href="/calendar" className="text-xs text-muted-foreground hover:text-foreground">
                전체 <ArrowRight className="inline size-3" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">오늘 일정이 없습니다</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {todayEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <Link
                      href={e.propertyId ? `/properties/${e.propertyId}/edit` : "/calendar"}
                      className="flex items-center gap-2 truncate text-sm hover:underline"
                    >
                      <Badge variant="outline" className="font-normal">
                        {EVENT_LABEL[e.category] ?? e.category}
                      </Badge>
                      <span className="truncate">{e.title}</span>
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {e.startTime ?? "종일"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 최근 매물 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" /> 최근 매물
            </CardTitle>
            <CardAction>
              <Link href="/properties" className="text-xs text-muted-foreground hover:text-foreground">
                전체 <ArrowRight className="inline size-3" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {recentProperties.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">등록된 매물이 없습니다</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {recentProperties.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <Link
                      href={`/properties/${p.id}/edit`}
                      className="truncate text-sm hover:underline"
                    >
                      {p.name ?? p.complexName ?? "매물"}
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="font-normal">{p.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(p.createdAt, { addSuffix: true, locale: ko })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 고객 + 네이버 매물(작게) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard href="/customers" label="고객" value={customerCount} icon={<Users className="size-4" />} />
        <Card className="col-span-2 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5">
              <MapPin className="size-3.5" /> 우리 지역 네이버 매물(캐시)
            </CardDescription>
            <CardTitle className="text-2xl">
              {naverSummary?.articleCount ?? 0}
              <span className="ml-1 text-sm font-normal text-muted-foreground">건</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Link href="/naver" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              최신 매물 수집하러 가기 <ArrowRight className="inline size-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 우리 지역 실거래 — 큰 섹션 */}
      {region ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="size-5" /> 우리 지역 실거래
              </h2>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {user.address}
                <span className="mx-1">·</span>최근 6개월 매매
              </p>
            </div>
            <Link
              href="/realprice"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              상세 조회 <ArrowRight className="inline size-3" />
            </Link>
          </div>

          {realpriceSummary ? (
            <>
              <StatsPanel stats={realpriceSummary.stats} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">최근 거래</CardTitle>
                  <CardDescription>최근 거래 {realpriceSummary.recent.length}건</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>단지명</TableHead>
                          <TableHead>법정동</TableHead>
                          <TableHead className="text-right">전용면적</TableHead>
                          <TableHead className="text-right">거래가</TableHead>
                          <TableHead className="text-right">거래일</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {realpriceSummary.recent.map((r, i) => (
                          <TableRow key={`${r.dealDate}-${i}`}>
                            <TableCell className="font-medium">{r.name || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{r.umdNm}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.area != null ? `${r.area}㎡` : "-"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {won억(r.dealAmount ?? null)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {dealDateFmt(r.dealDate)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                수집된 실거래 데이터가 없습니다.
                <Link href="/realprice" className="ml-1 underline-offset-4 hover:underline">
                  실거래가 페이지에서 조회
                </Link>
                하면 채워집니다.
              </CardContent>
            </Card>
          )}
        </section>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-2 py-6">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5" /> 우리 지역 실거래 요약
            </CardDescription>
            <p className="text-sm">
              <Link href="/profile" className="font-medium underline-offset-4 hover:underline">
                내 프로필에서 주소를 등록
              </Link>
              하면 이 지역의 실거래 통계(월별 추이·평균가·최근 거래)와 네이버 매물 요약을 볼 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardContent className="flex flex-col gap-1 p-5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {icon}
            {label}
          </div>
          <span className="text-3xl font-semibold">{value}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
