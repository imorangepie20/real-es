"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import { CUSTOMER_TYPES } from "@/lib/customers/types"
import { deleteCustomer, type CustomerRow } from "./actions"

export function CustomerList({ initial }: { initial: CustomerRow[] }) {
  const [data, setData] = useState(initial)
  const [seen, setSeen] = useState(initial)
  if (seen !== initial) { setSeen(initial); setData(initial) }

  const [q, setQ] = useState("")
  const [type, setType] = useState("ALL")
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<CustomerRow | null>(null)

  const kw = q.trim().toLowerCase()
  const rows = data.filter(
    (c) =>
      (type === "ALL" || c.types.includes(type)) &&
      (!kw || c.name.toLowerCase().includes(kw) || (c.phone ?? "").toLowerCase().includes(kw)),
  )

  async function confirmRemove() {
    const c = pending
    if (!c) return
    setBusy(c.id)
    try {
      await deleteCustomer(c.id)
      setData((prev) => prev.filter((x) => x.id !== c.id))
      toast.success("삭제했습니다")
      setPending(null)
    } catch {
      toast.error("삭제에 실패했습니다")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
    <Card className="gap-0">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-2"><Users className="size-4" /> 고객관리</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-sm:flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·전화 검색" className="w-full pl-8 sm:w-44" />
            </div>
            <Select value={type} onValueChange={(v) => { if (v != null) setType(v) }}>
              <SelectTrigger className="w-32"><SelectValue>{type === "ALL" ? "전체 유형" : type}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 유형</SelectItem>
                {CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Link href="/customers/new" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="size-3.5" />새 고객
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <Empty className="border-0 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Users /></EmptyMedia>
              <EmptyTitle>고객이 없습니다</EmptyTitle>
              <EmptyDescription>
                {data.length === 0
                  ? "‘새 고객’ 또는 매물에서 ‘고객으로 등록’으로 추가하세요."
                  : "검색·필터 조건에 맞는 고객이 없습니다."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
          <div className="hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>전화번호</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>주소</TableHead>
                  <TableHead>연결 매물</TableHead>
                  <TableHead>수정일</TableHead>
                  <TableHead className="w-24 text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="tabular-nums">{c.phone || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.types.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{c.address || "-"}</TableCell>
                    <TableCell className="max-w-60">
                      {c.parties.length ? (
                        <div className="flex flex-wrap gap-1">
                          {c.parties.map((pp) => (
                            <Badge key={`${pp.propertyId}-${pp.role}`} variant="outline" className="font-normal">
                              {pp.role}·{pp.propertyLabel}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{c.updatedAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/customers/${c.id}`}
                          className={cn(buttonVariants({ size: "icon", variant: "ghost" }))}
                          aria-label="수정"
                        >
                          <Pencil className="size-3.5" />
                        </Link>
                        <Button size="icon" variant="ghost" onClick={() => setPending(c)} disabled={busy === c.id} aria-label="삭제">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 p-3 lg:hidden">
            {rows.map((c) => (
              <div key={c.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{c.name}</div>
                    <div className="tabular-nums text-sm text-muted-foreground">{c.phone || "-"}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link href={`/customers/${c.id}`} className={cn(buttonVariants({ size: "icon", variant: "ghost" }))} aria-label="수정"><Pencil className="size-3.5" /></Link>
                    <Button size="icon" variant="ghost" onClick={() => setPending(c)} disabled={busy === c.id} aria-label="삭제"><Trash2 className="size-3.5" /></Button>
                  </div>
                </div>
                {c.types.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.types.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                  </div>
                )}
                {c.address && <div className="text-sm text-muted-foreground">{c.address}</div>}
                {c.parties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.parties.map((pp) => <Badge key={`${pp.propertyId}-${pp.role}`} variant="outline" className="font-normal">{pp.role}·{pp.propertyLabel}</Badge>)}
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </CardContent>
    </Card>
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(o) => { if (!o) setPending(null) }}
      title="고객 삭제"
      description={pending ? `'${pending.name}' 고객을 삭제합니다. 되돌릴 수 없습니다.` : undefined}
      busy={busy === pending?.id}
      onConfirm={confirmRemove}
    />
    </>
  )
}
