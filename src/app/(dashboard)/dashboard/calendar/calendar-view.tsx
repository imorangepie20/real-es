"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  buildMonthGrid,
  ymd,
  MONTH_NAMES_KO,
  WEEKDAYS_KO,
} from "@/lib/calendar/month-grid";
import {
  CALENDAR_CATEGORIES,
  PROPERTY_EVENT_STYLE,
  categoryStyle,
} from "@/lib/calendar/categories";
import { loadCalendar, type EventRow, type CalendarOption } from "./actions";
import type { PropertyDateEvent } from "@/lib/calendar/property-events";
import { EventDialog } from "./event-dialog";
import { EventDetailDialog } from "./event-detail-dialog";

type LoadResult = {
  events: EventRow[];
  propertyDates: PropertyDateEvent[];
  properties: CalendarOption[];
  customers: CalendarOption[];
};

const PROPERTY_FILTER = "매물";
const MAX_CELL_ITEMS = 3;

// 실제 오늘(렌더 시점)의 YYYYMMDD — 템플릿의 고정 TODAY 대신 실제 날짜 사용.
function todayYmd(): string {
  const now = new Date();
  return ymd(now.getFullYear(), now.getMonth(), now.getDate());
}

export function CalendarView() {
  const router = useRouter();
  // 초기 상태는 실제 URL(useSearchParams)에서 읽는다 — 뒤로가기 시 Router Cache와 무관하게 복원.
  const searchParams = useSearchParams();

  const [view, setView] = useState(() => {
    const y = Number(searchParams.get("y"));
    const m = Number(searchParams.get("m"));
    if (Number.isInteger(y) && y > 1900 && Number.isInteger(m) && m >= 0 && m <= 11) {
      return { year: y, month: m };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [data, setData] = useState<LoadResult | null>(null);
  // data가 대응하는 {year,month}. view와 다르면 로딩 중으로 본다(파생 로딩).
  const [dataView, setDataView] = useState<{ year: number; month: number } | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set([...CALENDAR_CATEGORIES.map((c) => c.value), PROPERTY_FILTER]),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const d = searchParams.get("d");
    return d && /^\d{8}$/.test(d) ? d : null;
  });

  // 다이얼로그 상태. openSeq는 열 때마다 증가해 다이얼로그를 리마운트(초기값 갱신)한다.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [openSeq, setOpenSeq] = useState(0);

  // 상세보기 다이얼로그.
  const [detailEvent, setDetailEvent] = useState<EventRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSeq, setDetailSeq] = useState(0);

  // 순서가 어긋난 응답이 최신 응답을 덮어쓰지 않도록 요청 id로 가드.
  const requestRef = useRef(0);

  // 현재 view 기준 재로딩. 월 이동·저장/삭제 후 모두 이 경로를 공유한다.
  const reload = useCallback((year: number, month: number) => {
    const reqId = ++requestRef.current;
    loadCalendar(year, month)
      .then((result) => {
        if (requestRef.current !== reqId) return;
        setData(result);
        setDataView({ year, month });
      })
      .catch(() => {
        // 오래된 응답이면 무시; 그 외엔 데이터 없는 상태 유지.
      });
  }, []);

  useEffect(() => {
    reload(view.year, view.month);
  }, [view.year, view.month, reload]);

  // 캘린더 상태(연·월·선택일)를 URL에 반영 — 매물로 이동 후 뒤로가기 시 보던 달·선택일이 복원되도록.
  // history.replaceState는 리렌더·서버 재요청 없이 주소만 바꾼다(페이지 전체 갱신 아님). 뒤로가기 시
  // 서버 page가 그 URL의 searchParams로 1회 재실행되어 초기값을 복원한다.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("y", String(view.year));
    params.set("m", String(view.month));
    if (selectedDate) params.set("d", selectedDate);
    window.history.replaceState(null, "", `/dashboard/calendar?${params.toString()}`);
  }, [view.year, view.month, selectedDate]);

  const loading =
    !dataView || dataView.year !== view.year || dataView.month !== view.month;
  const today = todayYmd();
  const grid = buildMonthGrid(view.year, view.month);

  function prevMonth() {
    setView(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }
  function nextMonth() {
    setView(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }
  function resetToToday() {
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() });
  }

  function toggleFilter(value: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  // 일정 추가 — 선택 날짜(없으면 오늘) 기준으로 신규 다이얼로그.
  function openAdd() {
    setEditing(null);
    setDialogDate(selectedDate ?? today);
    setOpenSeq((n) => n + 1);
    setDialogOpen(true);
  }

  // 수기 일정 클릭 — 상세보기 다이얼로그.
  function openDetail(event: EventRow) {
    setDetailEvent(event);
    setDetailSeq((n) => n + 1);
    setDetailOpen(true);
  }
  // 상세 → 수정 전환.
  function editFromDetail() {
    if (!detailEvent) return;
    setDetailOpen(false);
    setEditing(detailEvent);
    setOpenSeq((n) => n + 1);
    setDialogOpen(true);
  }
  function goProperty(propertyId: string) {
    router.push(`/dashboard/properties/${propertyId}/edit`);
  }

  function eventsOn(cellYmd: string): EventRow[] {
    if (!data) return [];
    return data.events.filter(
      (e) => e.date === cellYmd && enabled.has(e.category),
    );
  }
  function propertyDatesOn(cellYmd: string): PropertyDateEvent[] {
    if (!data || !enabled.has(PROPERTY_FILTER)) return [];
    return data.propertyDates.filter((e) => e.date === cellYmd);
  }

  const selectedEvents = selectedDate ? eventsOn(selectedDate) : [];
  const selectedPropertyDates = selectedDate
    ? propertyDatesOn(selectedDate)
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      {/* ── 헤더 ── */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={prevMonth}
            aria-label="이전 달"
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-[110px] text-center text-sm font-semibold">
            {MONTH_NAMES_KO[view.month]} {view.year}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={nextMonth}
            aria-label="다음 달"
          >
            <ChevronRight />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={resetToToday}>
          오늘
        </Button>

        {loading && (
          <span className="text-xs text-muted-foreground">불러오는 중…</span>
        )}

        <div className="ml-auto">
          <Button size="sm" onClick={openAdd}>
            <Plus />
            일정 추가
          </Button>
        </div>
      </div>

      {/* ── 본문 ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── 좌측 사이드바: 유형 필터 ── */}
        <aside className="flex w-56 flex-shrink-0 flex-col gap-4 overflow-y-auto border-r p-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              일정 유형
            </p>
            <div className="flex flex-col gap-2">
              {CALENDAR_CATEGORIES.map((cat) => (
                <label
                  key={cat.value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={enabled.has(cat.value)}
                    onCheckedChange={() => toggleFilter(cat.value)}
                  />
                  <span
                    className={cn(
                      "size-2.5 flex-shrink-0 rounded-full",
                      cat.dot,
                    )}
                  />
                  <span className="text-sm">{cat.value}</span>
                </label>
              ))}

              <Separator className="my-1" />

              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={enabled.has(PROPERTY_FILTER)}
                  onCheckedChange={() => toggleFilter(PROPERTY_FILTER)}
                />
                <span
                  className={cn(
                    "size-2.5 flex-shrink-0 rounded-full",
                    PROPERTY_EVENT_STYLE.dot,
                  )}
                />
                <span className="text-sm">매물 일정</span>
              </label>
            </div>
          </div>

          {selectedDate && (
            <>
              <Separator />
              <DayPanel
                date={selectedDate}
                events={selectedEvents}
                propertyDates={selectedPropertyDates}
                onSelectEvent={openDetail}
                onSelectProperty={goProperty}
              />
            </>
          )}
        </aside>

        {/* ── 월 그리드 ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {WEEKDAYS_KO.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 6주 = 42칸 */}
          <div className="grid flex-1 grid-cols-7 grid-rows-6">
            {grid.map((cell, idx) => {
              const cellYmd = ymd(cell.year, cell.month, cell.day);
              const manual = eventsOn(cellYmd);
              const propEvents = propertyDatesOn(cellYmd);
              const total = manual.length + propEvents.length;
              const isToday = cellYmd === today;
              const isSelected = cellYmd === selectedDate;

              // 표시 항목 cap — 수기 일정 우선, 남는 칸에 매물 파생.
              const shownManual = manual.slice(0, MAX_CELL_ITEMS);
              const remaining = MAX_CELL_ITEMS - shownManual.length;
              const shownProp = remaining > 0 ? propEvents.slice(0, remaining) : [];
              const overflow = total - shownManual.length - shownProp.length;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(cellYmd)}
                  className={cn(
                    "flex min-h-0 cursor-pointer flex-col gap-0.5 border-r border-b p-1 text-left transition-colors hover:bg-muted/40",
                    (idx + 1) % 7 === 0 && "border-r-0",
                    idx >= 35 && "border-b-0",
                    !cell.isCurrentMonth && "bg-muted/20",
                    isSelected && "bg-primary/5 ring-1 ring-primary/30 ring-inset",
                  )}
                >
                  <div className="flex h-6 items-start px-0.5">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs leading-none",
                        isToday && "bg-primary font-semibold text-primary-foreground",
                        !isToday && cell.isCurrentMonth && "text-foreground",
                        !isToday &&
                          !cell.isCurrentMonth &&
                          "text-muted-foreground/50",
                      )}
                    >
                      {cell.day}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {shownManual.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); openDetail(e); }}
                        className="flex w-full items-center gap-1 truncate rounded-sm text-left text-[11px] leading-tight hover:bg-muted"
                        title={e.title}
                      >
                        <span
                          className={cn(
                            "size-1.5 flex-shrink-0 rounded-full",
                            categoryStyle(e.category).dot,
                          )}
                        />
                        <span className="truncate">{e.title}</span>
                      </button>
                    ))}
                    {shownProp.map((e) => (
                      <button
                        key={`${e.propertyId}-${e.field}`}
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); goProperty(e.propertyId); }}
                        className="flex w-full items-center gap-1 truncate rounded-sm text-left text-[11px] leading-tight hover:bg-muted"
                        title={e.label}
                      >
                        <span
                          className={cn(
                            "size-1.5 flex-shrink-0 rounded-full",
                            PROPERTY_EVENT_STYLE.dot,
                          )}
                        />
                        <span className="truncate">{e.label}</span>
                      </button>
                    ))}
                    {overflow > 0 && (
                      <div className="px-0.5 text-[10px] font-medium text-muted-foreground">
                        +{overflow}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {data && (
        <EventDialog
          key={openSeq}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          event={editing ?? undefined}
          defaultDate={dialogDate ?? undefined}
          properties={data.properties}
          customers={data.customers}
          onSaved={() => {
            setDialogOpen(false);
            reload(view.year, view.month);
          }}
        />
      )}

      <EventDetailDialog
        key={`detail-${detailSeq}`}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        event={detailEvent}
        onEdit={editFromDetail}
        onChanged={() => {
          setDetailOpen(false);
          reload(view.year, view.month);
        }}
        onSelectProperty={goProperty}
      />
    </div>
  );
}

// ── 선택한 날짜의 일정 패널 ──

function formatYmd(value: string): string {
  const m = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
  return `${m}월 ${d}일`;
}

interface DayPanelProps {
  date: string;
  events: EventRow[];
  propertyDates: PropertyDateEvent[];
  onSelectEvent: (event: EventRow) => void;
  onSelectProperty: (propertyId: string) => void;
}

function DayPanel({
  date,
  events,
  propertyDates,
  onSelectEvent,
  onSelectProperty,
}: DayPanelProps) {
  const empty = events.length === 0 && propertyDates.length === 0;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {formatYmd(date)} 일정
      </p>
      {empty ? (
        <p className="text-xs text-muted-foreground">일정이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {events.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelectEvent(e)}
              className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted"
            >
              <span
                className={cn(
                  "mt-1 size-2 flex-shrink-0 rounded-full",
                  categoryStyle(e.category).dot,
                )}
              />
              <div className="min-w-0">
                <p className="truncate text-sm leading-tight font-medium">
                  {e.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {e.startTime ? `${e.startTime} · ` : ""}
                  {e.category}
                  {e.propertyLabel ? ` · ${e.propertyLabel}` : ""}
                </p>
              </div>
            </button>
          ))}
          {propertyDates.map((e) => (
            <button
              key={`${e.propertyId}-${e.field}`}
              type="button"
              onClick={() => onSelectProperty(e.propertyId)}
              className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted"
            >
              <span
                className={cn(
                  "mt-1 size-2 flex-shrink-0 rounded-full",
                  PROPERTY_EVENT_STYLE.dot,
                )}
              />
              <div className="min-w-0">
                <p className="truncate text-sm leading-tight font-medium">
                  {e.label}
                </p>
                <p className={cn("text-[11px]", PROPERTY_EVENT_STYLE.text)}>
                  매물 일정
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
