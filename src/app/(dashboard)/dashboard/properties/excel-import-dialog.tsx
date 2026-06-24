"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PROPERTY_FIELDS } from "@/lib/properties/fields"
import { buildImportRows, countIssues, type ParsedSheet } from "@/lib/properties/excel-import"
import { analyzeWorkbook, importProperties } from "./actions"

export function ExcelImportDialog() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<Record<number, string | null>>({})
  const [busy, setBusy] = useState(false)

  function reset() { setParsed(null); setMapping({}); if (fileRef.current) fileRef.current.value = "" }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set("file", file)
      const result = await analyzeWorkbook(fd)
      if (result.rows.length === 0) { toast.error("데이터 행이 없습니다"); reset(); return }
      setParsed(result)
      setMapping(Object.fromEntries(result.matches.map((m) => [m.index, m.fieldKey])))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "엑셀을 읽지 못했습니다")
    } finally { setBusy(false) }
  }

  const issues = parsed ? countIssues(parsed, mapping) : 0
  const mappedCount = Object.values(mapping).filter(Boolean).length

  async function confirm() {
    if (!parsed) return
    setBusy(true)
    try {
      const rows = buildImportRows(parsed, mapping)
      const n = await importProperties(rows)
      toast.success(`매물 ${n}건을 추가했습니다`)
      setOpen(false); reset(); router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가 실패")
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Upload className="size-3.5" />엑셀 입력
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>엑셀 입력</DialogTitle>
          <DialogDescription>
            {parsed ? "각 열을 매물 항목에 연결하세요. 자동으로 맞춘 항목은 바꿀 수 있습니다." : "첫 시트의 1행을 헤더로 읽어 항목을 자동 연결합니다."}
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <input ref={fileRef} type="file" accept=".xlsx" onChange={onFile} disabled={busy} className="text-sm" />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="max-h-80 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>엑셀 열</TableHead><TableHead>미리보기</TableHead><TableHead>매물 항목</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.headers.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{h || `(열 ${i + 1})`}</TableCell>
                      <TableCell className="text-muted-foreground">{parsed.rows[0]?.[i] ?? "-"}</TableCell>
                      <TableCell>
                        <NativeSelect className="w-full" value={mapping[i] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value || null }))}>
                          <NativeSelectOption value="">무시</NativeSelectOption>
                          {PROPERTY_FIELDS.map((f) => <NativeSelectOption key={f.key} value={f.key}>{f.label}</NativeSelectOption>)}
                        </NativeSelect>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">
              {parsed.rows.length}행 · 연결된 항목 {mappedCount}개
              {issues > 0 && <span className="text-destructive"> · 숫자 형식이 아닌 {issues}개 셀은 빈 값으로 들어갑니다</span>}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false) }}>취소</Button>
          <Button onClick={confirm} disabled={busy || !parsed || mappedCount === 0}>{parsed ? `${parsed.rows.length}건 추가` : "추가"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
