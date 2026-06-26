"use client";

import { useState, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { categoryStyle } from "@/lib/calendar/categories";
import { deleteEvent, type EventRow } from "./actions";

function fmtDate(value: string): string {
  if (value.length !== 8) return value;
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventRow | null;
  onEdit: () => void;
  onChanged: () => void;
  onSelectProperty: (propertyId: string) => void;
}

export function EventDetailDialog({
  open,
  onOpenChange,
  event,
  onEdit,
  onChanged,
  onSelectProperty,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!event) return;
    if (!window.confirm("이 일정을 삭제할까요?")) return;
    setBusy(true);
    try {
      await deleteEvent(event.id);
      toast.success("삭제했습니다");
      onChanged();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다");
      setBusy(false);
    }
  }

  const style = event ? categoryStyle(event.category) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {event && style && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className={cn("size-2.5 shrink-0 rounded-full", style.dot)} />
                <span className="truncate">{event.title}</span>
              </DialogTitle>
            </DialogHeader>

            <dl className="flex flex-col gap-2.5 text-sm">
              <Row label="날짜">{fmtDate(event.date)}</Row>
              <Row label="시간">{event.startTime || "종일"}</Row>
              <Row label="유형">
                <span className={cn("inline-flex items-center gap-1.5", style.text)}>
                  <span className={cn("size-2 rounded-full", style.dot)} />
                  {event.category}
                </span>
              </Row>
              {event.propertyLabel && event.propertyId && (
                <Row label="매물">
                  <button
                    type="button"
                    onClick={() => onSelectProperty(event.propertyId as string)}
                    className="text-primary hover:underline"
                  >
                    {event.propertyLabel}
                  </button>
                </Row>
              )}
              {event.customerLabel && <Row label="고객">{event.customerLabel}</Row>}
              {event.memo && (
                <Row label="메모">
                  <span className="whitespace-pre-wrap">{event.memo}</span>
                </Row>
              )}
            </dl>

            <DialogFooter className="sm:justify-between">
              <Button variant="destructive" onClick={remove} disabled={busy}>
                <Trash2 className="size-3.5" />
                삭제
              </Button>
              <div className="flex gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                  닫기
                </Button>
                <Button onClick={onEdit} disabled={busy}>
                  <Pencil className="size-3.5" />
                  수정
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-12 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
