import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyIllustration } from "@/components/empty-illustration";

export default function PermissionsPage() {
  return (
    <>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">권한 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          역할별 권한을 설정합니다.
        </p>
      </div>

      {/* Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>준비 중입니다</CardTitle>
          <CardDescription>
            역할별 메뉴 및 기능 권한 설정 기능이 준비 중입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <EmptyIllustration className="size-16 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-4">
              현재는 슈퍼 어드민(superadmin) 역할만 존재합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
