"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Star, Trash2, Pencil, CircleCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { EditCell, SelectCell } from "@/components/data-grid/editable-cell"
import { FIELD_BY_KEY, LIST_COLUMNS, STATUS_OPTIONS, type PropertyField } from "@/lib/properties/fields"
import { TRADE_LABEL, TRADE_OPTIONS } from "@/lib/naver/trade-types"
import { PROPERTY_LABEL, PROPERTY_OPTIONS } from "@/lib/naver/property-types"
import { deleteProperties, setPropertyStatus, togglePropertyFavorite, updateProperty, type PropertyRow, type PropertyView } from "./actions"
import { ExcelImportDialog } from "./excel-import-dialog"

const VIEW_TITLE: Record<PropertyView, string> = { all: "전체 매물", favorites: "관심 매물", contracted: "계약완료" }
const won = (v: string | number | null) => (v == null || v === "" ? "-" : Number(v).toLocaleString("ko-KR"))
const ymd = (v: string | number | null) => { const s = v == null ? "" : String(v); return s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : (s || "-") }

function display(field: PropertyField, value: string | number | boolean | null) {
  if (value == null || value === "") return "-"
  switch (field.type) {
    case "money": return won(value as string)
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

  const rows = data.filter(
    (p) => (fType === "ALL" || p.realEstateType === fType)
      && (fTrade === "ALL" || p.tradeType === fTrade)
      && (fStatus === "ALL" || p.status === fStatus),
  )
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
        <CardAction className="flex flex-wrap items-center gap-2">
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
          {view !== "contracted" && (
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
              <Button size="sm" variant="outline" onClick={() => run(() => setPropertyStatus([...sel], "계약완료"), "계약완료로 전환했습니다")} disabled={busy}>
                <CircleCheck className="size-3.5" />계약완료
              </Button>
              <Button size="sm" variant="destructive" onClick={() => run(() => deleteProperties([...sel]), "삭제했습니다")} disabled={busy}>
                <Trash2 className="size-3.5" />삭제 {sel.size}
              </Button>
            </>
          )}
          <ExcelImportDialog />
          <Button size="sm" render={<Link href="/dashboard/properties/new" />}>
            <Plus className="size-3.5" />새 매물
          </Button>
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
                  <TableHead className="w-10" aria-label="관심" />
                  {LIST_COLUMNS.map((k) => <TableHead key={k}>{FIELD_BY_KEY[k].label}</TableHead>)}
                  <TableHead className="w-10" aria-label="수정" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p, i) => (
                  <TableRow key={p.id} data-state={sel.has(p.id) ? "selected" : undefined}>
                    <TableCell><Checkbox checked={sel.has(p.id)} onCheckedChange={(c) => toggleOne(p.id, c)} aria-label="선택" /></TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{rows.length - i}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => toggleFav(p)} aria-label="관심" className="text-muted-foreground hover:text-foreground">
                        <Star className={cn("size-4", p.isFavorite && "fill-amber-400 text-amber-400")} />
                      </button>
                    </TableCell>
                    {LIST_COLUMNS.map((k) => {
                      const f = FIELD_BY_KEY[k]
                      const v = p[k]
                      if (f.type === "select") {
                        return <TableCell key={k}><SelectCell value={String(v ?? "")} label={display(f, v)} options={f.options ?? []} onSave={(nv) => patchRow(p.id, { [k]: nv })} /></TableCell>
                      }
                      const numeric = f.type === "money" || f.type === "number" || f.type === "area"
                      return <TableCell key={k} className={cn(k === "complexName" && "min-w-40 font-medium")}><EditCell numeric={numeric} value={v as string | number | null} display={display(f, v)} onSave={(nv) => patchRow(p.id, { [k]: nv })} /></TableCell>
                    })}
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
