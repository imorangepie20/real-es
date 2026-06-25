import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SidebarProvider>
      <div className="print:hidden"><AppSidebar /></div>
      <SidebarInset>
        <div className="print:hidden"><AppHeader /></div>
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
        <div className="print:hidden"><AppFooter /></div>
      </SidebarInset>
    </SidebarProvider>
  );
}
