import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CommandPalette } from "@/components/layout/command-palette";
import { Notifications } from "@/components/layout/notifications";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function AppHeader() {
  const user = await getCurrentUser();
  const initials = (user?.name ?? user?.email ?? "?").trim().slice(0, 2).toUpperCase();
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-2">
        <CommandPalette />
        <ThemeToggle />
        <Notifications />
        <Link href="/profile" aria-label="내 프로필">
          <Avatar className="size-8 cursor-pointer">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
