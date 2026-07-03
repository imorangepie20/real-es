"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyIllustration } from "@/components/empty-illustration";
import { markRead, markAllRead, type NotificationRow } from "@/lib/notifications/actions";

const TYPE_LABEL: Record<string, string> = {
  member: "회원",
  contract: "계약",
  property: "매물",
};

export function NotificationsView({ initial }: { initial: NotificationRow[] }) {
  const [items, setItems] = useState(initial);

  const unread = items.filter((n) => !n.read).length;

  async function readOne(id: string) {
    await markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }
  async function readAll() {
    await markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">알림</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `안 읽은 알림 ${unread}건` : "시스템 이벤트 알림"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={readAll}>
            <CheckCheck className="size-3.5" />
            모두 읽음
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <EmptyIllustration className="size-16 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">알림이 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                onClick={() => { if (!n.read) readOne(n.id); }}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 hover:bg-accent",
                  !n.read && "bg-primary/5",
                )}
              >
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {TYPE_LABEL[n.type] ?? "알"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{n.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: ko })}
                    </span>
                  </div>
                  {n.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.description}</p>
                  )}
                </div>
                {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="안 읽음" />}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
