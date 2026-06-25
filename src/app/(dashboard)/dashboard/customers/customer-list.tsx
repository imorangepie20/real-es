"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

  const kw = q.trim().toLowerCase()
  const rows = data.filter(
    (c) =>
      (type === "ALL" || c.types.includes(type)) &&
      (!kw || c.name.toLowerCase().includes(kw) || (c.phone ?? "").toLowerCase().includes(kw)),
  )

  async function remove(c: CustomerRow) {
    if (!confirm(`'${c.name}' 고객을 삭제할까요?`)) return
    setBusy(c.id)
    try {
      await deleteCustomer(c.id)
      setData((prev) => prev.filter((x) => x.id !== c.id))
      toast.success("삭제했습니다")
    } catch {
      toast.error("삭제에 실패했습니다")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="gap-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2"><Users className="size-4" /> 고객관리</CardTitle>
        <CardAction className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·전화 검색" className="w-44 pl-8" />
          </div>
          <Select value={type} onValueChange={(v) => { if (v != null) setType(v) }}>
            <SelectTrigger className="w-32"><SelectValue>{type === "ALL" ? "전체 유형" : type}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 유형</SelectItem>
              {CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Link href="/dashboard/customers/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="size-3.5" />새 고객
          </Link>
        </CardAction>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>전화번호</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>주소</TableHead>
                  <TableHead>출처 매물</TableHead>
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
                    <TableCell className="text-muted-foreground">{c.propertyName || "-"}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{c.updatedAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/dashboard/customers/${c.id}`}
                          className={cn(buttonVariants({ size: "icon", variant: "ghost" }))}
                          aria-label="수정"
                        >
                          <Pencil className="size-3.5" />
                        </Link>
                        <Button size="icon" variant="ghost" onClick={() => remove(c)} disabled={busy === c.id} aria-label="삭제">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
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
