"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listNotifications,
  unreadCount,
  markAllRead,
  type NotificationRow,
} from "@/lib/notifications/actions";

export function Notifications() {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);

  const load = useCallback(async () => {
    try {
      const [u, list] = await Promise.all([unreadCount(), listNotifications()]);
      setUnread(u);
      setItems(list.slice(0, 8));
    } catch {
      // 미인증 등 — 조용히 둠
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function allRead() {
    await markAllRead();
    await load();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="알림">
            <Bell className="size-5" />
            {unread > 0 && (
              <Badge className="absolute -right-0.5 -top-0.5 size-4 justify-center rounded-full p-0 text-[10px]">
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">알림</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={allRead}>
              모두 읽음
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">알림이 없습니다</div>
        ) : (
          items.map((n) => (
            <Link
              key={n.id}
              href={n.link ?? "/notifications"}
              className={cn(
                "flex flex-col gap-0.5 px-2 py-2 hover:bg-accent",
                !n.read && "bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{n.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: ko })}
                </span>
              </div>
              {n.description && (
                <span className="text-xs text-muted-foreground">{n.description}</span>
              )}
            </Link>
          ))
        )}
        <DropdownMenuSeparator />
        <Link
          href="/notifications"
          className="block px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-accent"
        >
          전체 보기
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
