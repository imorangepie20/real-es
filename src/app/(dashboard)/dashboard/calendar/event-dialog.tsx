"use client";

import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { CALENDAR_CATEGORIES } from "@/lib/calendar/categories";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  type EventInput,
  type EventRow,
  type CalendarOption,
} from "./actions";

// YYYYMMDD ↔ YYYY-MM-DD (date input value).
function ymdToInput(value?: string | null): string {
  if (!value || value.length !== 8) return "";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}
function inputToYmd(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 8);
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventRow;
  defaultDate?: string;
  properties: CalendarOption[];
  customers: CalendarOption[];
  onSaved: () => void;
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  properties,
  customers,
  onSaved,
}: EventDialogProps) {
  // props에서 직접 초기화. 부모가 open/대상마다 key를 바꿔 리마운트하므로
  // effect 동기화 없이 매번 신선한 초기값을 갖는다.
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(ymdToInput(event ? event.date : defaultDate));
  const [allDay, setAllDay] = useState(event ? !event.startTime : true);
  const [startTime, setStartTime] = useState(event?.startTime ?? "");
  const [category, setCategory] = useState<string>(event?.category ?? "기타");
  const [propertyId, setPropertyId] = useState(event?.propertyId ?? "");
  const [customerId, setCustomerId] = useState(event?.customerId ?? "");
  const [memo, setMemo] = useState(event?.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function save() {
    const ymd = inputToYmd(date);
    if (!title.trim()) {
      toast.error("제목을 입력하세요");
      return;
    }
    if (ymd.length !== 8) {
      toast.error("날짜를 선택하세요");
      return;
    }
    const input: EventInput = {
      title: title.trim(),
      date: ymd,
      startTime: allDay ? null : startTime.trim() || null,
      category,
      memo: memo.trim() || null,
      propertyId: propertyId || null,
      customerId: customerId || null,
    };
    setSaving(true);
    try {
      if (event) await updateEvent(event.id, input);
      else await createEvent(input);
      toast.success(event ? "수정했습니다" : "등록했습니다");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다");
      setSaving(false);
    }
  }

  async function remove() {
    if (!event) return;
    setSaving(true);
    try {
      await deleteEvent(event.id);
      toast.success("삭제했습니다");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "일정 수정" : "새 일정"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>
              제목<span className="text-destructive"> *</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>
                날짜<span className="text-destructive"> *</span>
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>시간</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={startTime}
                  disabled={allDay}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1"
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={allDay}
                    onCheckedChange={(checked) => {
                      const on = checked === true;
                      setAllDay(on);
                      if (on) setStartTime("");
                    }}
                  />
                  종일
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>유형</Label>
            <NativeSelect
              className="w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CALENDAR_CATEGORIES.map((c) => (
                <NativeSelectOption key={c.value} value={c.value}>
                  {c.value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>매물 연결</Label>
              <NativeSelect
                className="w-full"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                <NativeSelectOption value="">미연결</NativeSelectOption>
                {properties.map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>고객 연결</Label>
              <NativeSelect
                className="w-full"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <NativeSelectOption value="">미연결</NativeSelectOption>
                {customers.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>메모</Label>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="메모"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {event ? (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)} disabled={saving}>
              <Trash2 className="size-3.5" />
              삭제
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button onClick={save} disabled={saving}>
              <Save className="size-3.5" />
              {saving ? "저장 중" : "저장"}
            </Button>
          </div>
        </DialogFooter>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="일정 삭제"
          description="이 일정을 삭제합니다. 되돌릴 수 없습니다."
          busy={saving}
          onConfirm={remove}
        />
      </DialogContent>
    </Dialog>
  );
}
