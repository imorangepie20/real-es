"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Star, Trash2, Pencil, CircleCheck, UserPlus, Search, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { EditCell, SelectCell } from "@/components/data-grid/editable-cell"
import { FIELD_BY_KEY, LIST_COLUMNS, STATUS_OPTIONS, type PropertyField } from "@/lib/properties/fields"
import { TRADE_LABEL, TRADE_OPTIONS } from "@/lib/naver/trade-types"
import { PROPERTY_LABEL, PROPERTY_OPTIONS } from "@/lib/naver/property-types"
import { COLOR_TAGS, COLOR_TAG_MAP } from "@/lib/properties/color-tags"
import { deleteProperties, togglePropertyFavorite, updateProperty, setPropertyColor, type PropertyRow, type PropertyView } from "./actions"
import { startContract } from "./contract-actions"
import { ExcelImportDialog } from "./excel-import-dialog"
import { PropertyExportDialog } from "./property-export-dialog"

const VIEW_TITLE: Record<PropertyView, string> = { all: "전체 매물", favorites: "관심 매물", "in-progress": "계약진행", contracted: "계약완료" }
const won = (v: string | number | null) => (v == null || v === "" ? "-" : (Number(v) / 10000).toLocaleString("ko-KR")) // 원 저장 → 만원 표시
const ymd = (v: string | number | null) => { const s = v == null ? "" : String(v); return s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : (s || "-") }

function display(field: PropertyField, value: string | number | boolean | null) {
  if (value == null || value === "") return "-"
  switch (field.type) {
    case "money": return `${won(value as string)}만원`
    case "date": return ymd(value as string)
    case "select": return field.options?.find((o) => o.value === value)?.label ?? String(value)
    case "bool": return value ? "예" : "아니오"
    default: return String(value)
  }
}

export function PropertyList({ rows: initial, view }: { rows: PropertyRow[]; view: PropertyView }) {
  const router = useRouter()
  const [data, setData] = useState(initial)
  const [seen, setSeen] = useState(initial)
  if (seen !== initial) { setSeen(initial); setData(initial) }

  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [fType, setFType] = useState("ALL")
  const [fTrade, setFTrade] = useState("ALL")
  const [fStatus, setFStatus] = useState("ALL")
  const [q, setQ] = useState("")
  const [fColor, setFColor] = useState<string | null>(null)

  const kw = q.trim().toLowerCase()
  const rows = data.filter((p) => {
    if (fType !== "ALL" && p.realEstateType !== fType) return false
    if (fTrade !== "ALL" && p.tradeType !== fTrade) return false
    if (fStatus !== "ALL" && p.status !== fStatus) return false
    if (view === "all" && fColor && p.colorTag !== fColor) return false
    if (kw && ![p.name, p.complexName, p.address, p.customerName, p.customerPhone].some((v) => String(v ?? "").toLowerCase().includes(kw))) return false
    return true
  })
  const allSelected = rows.length > 0 && rows.every((p) => sel.has(p.id))
  const someSelected = rows.some((p) => sel.has(p.id)) && !allSelected
  const toggleAll = (c: boolean) => setSel(c ? new Set(rows.map((p) => p.id)) : new Set())
  const toggleOne = (id: string, c: boolean) => setSel((prev) => { const next = new Set(prev); if (c) next.add(id); else next.delete(id); return next })

  function patchRow(id: string, patch: Partial<PropertyRow>) {
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } as PropertyRow : r)))
    updateProperty(id, patch).catch((e) => toast.error(e instanceof Error ? e.message : "저장 실패"))
  }
  function toggleFav(p: PropertyRow) {
    const next = !p.isFavorite
    setData((prev) => prev.map((r) => (r.id === p.id ? { ...r, isFavorite: next } as PropertyRow : r)))
    togglePropertyFavorite(p.id, next).then(() => router.refresh()).catch((e) => toast.error(e instanceof Error ? e.message : "저장 실패"))
  }
  function setColor(p: PropertyRow, colorTag: string | null) {
    setData((prev) => prev.map((r) => (r.id === p.id ? { ...r, colorTag } as PropertyRow : r)))
    setPropertyColor(p.id, colorTag).catch((e) => toast.error(e instanceof Error ? e.message : "저장 실패"))
  }
  async function run(fn: () => Promise<unknown>, ok: string) {
    if (!sel.size) return
    setBusy(true)
    try { await fn(); toast.success(ok); setSel(new Set()); router.refresh() }
    catch (e) { toast.error(e instanceof Error ? e.message : "실패") }
    finally { setBusy(false) }
  }

  return (
    <Card className="gap-0">
      <CardHeader className="border-b">
        <CardTitle>{VIEW_TITLE[view]}</CardTitle>
        {view === "all" && (
          <div className="flex items-center gap-1" role="group" aria-label="색상 필터">
            {COLOR_TAGS.map((c) => (
              <button key={c.value} type="button" title={`${c.label} 필터`} aria-pressed={fColor === c.value}
                onClick={() => setFColor(fColor === c.value ? null : c.value)}
                className={cn("size-2 rounded-full transition", c.dot, fColor === c.value ? "ring-2 ring-foreground/50 ring-offset-1" : "opacity-50 hover:opacity-100")} />
            ))}
          </div>
        )}
        <CardAction className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="매물명·단지·주소·고객 검색" className="w-52 pl-8" />
          </div>
          <Select value={fType} onValueChange={(v) => { if (v != null) setFType(v) }}>
            <SelectTrigger className="h-8"><SelectValue>{fType === "ALL" ? "매물유형 전체" : PROPERTY_LABEL[fType] ?? fType}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">매물유형 전체</SelectItem>
              {PROPERTY_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fTrade} onValueChange={(v) => { if (v != null) setFTrade(v) }}>
            <SelectTrigger className="h-8"><SelectValue>{fTrade === "ALL" ? "거래유형 전체" : TRADE_LABEL[fTrade] ?? fTrade}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">거래유형 전체</SelectItem>
              {TRADE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {view !== "contracted" && view !== "in-progress" && (
            <Select value={fStatus} onValueChange={(v) => { if (v != null) setFStatus(v) }}>
              <SelectTrigger className="h-8"><SelectValue>{fStatus === "ALL" ? "상태 전체" : fStatus}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">상태 전체</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {sel.size > 0 && (
            <>
              {(view === "all" || view === "favorites") && (
                <Button size="sm" variant="outline" onClick={() => run(() => Promise.all([...sel].map((sid) => startContract(sid))), "계약진행으로 전환했습니다")} disabled={busy}>
                  <CircleCheck className="size-3.5" />계약진행
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => run(() => deleteProperties([...sel]), "삭제했습니다")} disabled={busy}>
                <Trash2 className="size-3.5" />삭제 {sel.size}
              </Button>
            </>
          )}
          {view === "all" && <ExcelImportDialog />}
          <PropertyExportDialog view={view} fType={fType} fTrade={fTrade} fStatus={fStatus} />
          {view === "all" && (
            <Button size="sm" render={<Link href="/dashboard/properties/new" />}>
              <Plus className="size-3.5" />새 매물
            </Button>
          )}
          <span className="text-sm text-muted-foreground">{rows.length}개</span>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <Empty className="border-0 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Star /></EmptyMedia>
              <EmptyTitle>매물이 없습니다</EmptyTitle>
              <EmptyDescription>{'"새 매물"로 직접 등록하거나 "엑셀 입력"으로 한 번에 추가하세요. 셀을 더블클릭하면 바로 수정됩니다.'}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={(c) => toggleAll(c)} aria-label="전체 선택" /></TableHead>
                  <TableHead className="w-12 text-right">#</TableHead>
                  <TableHead className={view === "all" ? "w-16" : "w-10"} aria-label="관심" />
                  {LIST_COLUMNS.map((k) => <TableHead key={k}>{FIELD_BY_KEY[k].label}</TableHead>)}
                  <TableHead className="w-12" aria-label="계약" />
                  <TableHead className="w-10" aria-label="수정" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p, i) => (
                  <TableRow key={p.id} data-state={sel.has(p.id) ? "selected" : undefined}
                    className={cn(view === "all" && p.colorTag ? COLOR_TAG_MAP[p.colorTag as string]?.row : undefined)}>
                    <TableCell><Checkbox checked={sel.has(p.id)} onCheckedChange={(c) => toggleOne(p.id, c)} aria-label="선택" /></TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{rows.length - i}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => toggleFav(p)} aria-label="관심" className="text-muted-foreground hover:text-foreground">
                          <Star className={cn("size-4", p.isFavorite && "fill-amber-400 text-amber-400")} />
                        </button>
                        {view === "all" && <ColorSwatch value={p.colorTag as string | null} onChange={(c) => setColor(p, c)} />}
                      </div>
                    </TableCell>
                    {LIST_COLUMNS.map((k) => {
                      const f = FIELD_BY_KEY[k]
                      const v = p[k]
                      if (f.type === "select") {
                        return <TableCell key={k}><SelectCell value={String(v ?? "")} label={display(f, v)} options={f.options ?? []} onSave={(nv) => patchRow(p.id, { [k]: nv })} /></TableCell>
                      }
                      if (k === "customerName") {
                        const cname = String(v ?? "")
                        return <TableCell key={k}>
                          <div className="flex items-center gap-1">
                            <EditCell value={v as string | number | null} display={display(f, v)} onSave={(nv) => patchRow(p.id, { [k]: nv })} />
                            {cname && !p.customerRegistered && (
                              <Link href={`/dashboard/customers/new?propertyId=${p.id}`} title="고객관리 미등록 — 클릭해 등록" aria-label="고객관리에 등록" className="shrink-0 text-amber-500 hover:text-amber-600"><UserPlus className="size-3.5" /></Link>
                            )}
                          </div>
                        </TableCell>
                      }
                      const numeric = f.type === "money" || f.type === "number" || f.type === "area"
                      const editV = f.type === "money" && v != null ? Number(v) / 10000 : (v as string | number | null) // money는 만원으로 편집
                      return <TableCell key={k} className={cn(k === "complexName" && "min-w-40 font-medium")}><EditCell numeric={numeric} value={editV} display={display(f, v)} onSave={(nv) => patchRow(p.id, { [k]: nv })} /></TableCell>
                    })}
                    <TableCell>
                      {(p.status === "계약진행" || p.status === "계약완료") && (
                        <Link href={`/dashboard/properties/${p.id}/contract`} className="text-xs text-primary underline">계약</Link>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/properties/${p.id}/edit`} aria-label="수정" className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 행 색상 태그 스와치 — 클릭 시 팝오버로 4색 선택/해제. (전체 매물 메뉴 전용)
function ColorSwatch({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const cur = value ? COLOR_TAG_MAP[value] : null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="색상 태그"
            className={cn(
              "size-3.5 shrink-0 rounded-full border transition",
              cur ? cn(cur.dot, "border-transparent") : "border-dashed border-muted-foreground/50 hover:border-foreground",
            )}
          />
        }
      />
      <PopoverContent align="start" sideOffset={6} className="w-auto flex-row items-center gap-1.5 p-1.5">
        {COLOR_TAGS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onClick={() => { onChange(c.value); setOpen(false) }}
            className={cn("size-5 rounded-full ring-foreground/40 ring-offset-1 ring-offset-popover transition hover:ring-2", c.dot, value === c.value && "ring-2")}
          />
        ))}
        <button
          type="button"
          title="없음"
          onClick={() => { onChange(null); setOpen(false) }}
          className="flex size-5 items-center justify-center rounded-full border border-dashed text-muted-foreground transition hover:bg-muted"
        >
          <X className="size-3" />
        </button>
      </PopoverContent>
    </Popover>
  )
}
