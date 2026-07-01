import Link from "next/link";
import { Users, Settings, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const settingsSections = [
  {
    title: "회원 관리",
    description: "사용자 계정을 생성, 수정, 삭제하고 역할을 관리합니다.",
    href: "/dashboard/settings/members",
    icon: Users,
  },
  {
    title: "환경 설정",
    description: "사이트 기본 정보와 API 키를 관리합니다.",
    href: "/dashboard/settings/environment",
    icon: Settings,
  },
  {
    title: "권한 관리",
    description: "역할별 권한을 설정합니다. (준비 중)",
    href: "/dashboard/settings/permissions",
    icon: Shield,
  },
];

export default function SettingsPage() {
  return (
    <>
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-semibold">설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          시스템 설정을 관리합니다.
        </p>
      </div>

      {/* 설정 섹션 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="transition-colors hover:bg-accent/50 h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <section.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{section.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
