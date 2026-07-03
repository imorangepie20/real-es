import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowRight, MapPin, CalendarDays, Building2, Users } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HomeData } from "@/lib/home/queries";

// 원(정수) → 억/만 표기.
function won억(v: number | null): string {
  if (v == null) return "-";
  const 억 = Math.floor(v / 1e8);
  const 만 = Math.round((v % 1e8) / 1e4);
  return 억 > 0 ? `${억}억${만 > 0 ? ` ${만}만` : ""}` : `${만}만`;
}

const EVENT_LABEL: Record<string, string> = {
  미팅: "미팅",
  임장: "임장",
  계약: "계약",
  기타: "기타",
};

export function HomeView({ data }: { data: HomeData }) {
  const { propertyStats: s, todayEvents, recentProperties, customerCount, region, realpriceSummary, naverSummary } = data;
  const name = data.user.name ?? "회원";

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

      {/* 고객 + 주소 기반 요약 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard href="/customers" label="고객" value={customerCount} icon={<Users className="size-4" />} />

        {region ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> 우리 지역 실거래 (최근 3개월)
                </CardDescription>
                <CardTitle className="text-2xl">
                  {realpriceSummary?.count ?? 0}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">건</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                평균 거래가 {won억(realpriceSummary?.avgPrice ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> 우리 지역 네이버 매물(캐시)
                </CardDescription>
                <CardTitle className="text-2xl">
                  {naverSummary?.articleCount ?? 0}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">건</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                <Link href="/naver" className="hover:text-foreground hover:underline">최신 매물 수집 →</Link>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="lg:col-span-2">
            <CardContent className="flex flex-col items-start gap-2 py-5">
              <CardDescription className="flex items-center gap-1.5">
                <MapPin className="size-3.5" /> 우리 지역 요약
              </CardDescription>
              <p className="text-sm">
                <Link href="/profile" className="font-medium underline-offset-4 hover:underline">
                  내 프로필에서 주소를 등록
                </Link>
                하면 이 지역의 실거래 통계와 네이버 매물 요약을 볼 수 있습니다.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
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
