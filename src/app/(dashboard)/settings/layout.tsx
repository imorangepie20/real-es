import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { assertSuperAdmin } from "@/lib/auth/admin";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // superadmin만 접근 가능
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  try {
    await assertSuperAdmin(currentUser.id);
  } catch {
    redirect("/real-estate");
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 페이지 헤더는 각 페이지에서 처리 */}
      {children}
    </div>
  );
}
