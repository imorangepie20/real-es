"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Star, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TRADE_LABEL } from "@/lib/naver/trade-types"
import { PROPERTY_LABEL } from "@/lib/naver/property-types"
import { deleteFavorites, type ArticleRow } from "../actions"

const won = (v: string | null) => (v == null ? "-" : Number(v).toLocaleString("ko-KR"))

export function FavoritesView({ favorites }: { favorites: ArticleRow[] }) {
  const router = useRouter()
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const allSelected = favorites.length > 0 && sel.size === favorites.length
  const someSelected = sel.size > 0 && sel.size < favorites.length
  const toggleAll = (c: boolean) => setSel(c ? new Set(favorites.map((a) => a.articleNumber)) : new Set())
  const toggleOne = (n: string, c: boolean) => setSel((prev) => { const next = new Set(prev); if (c) next.add(n); else next.delete(n); return next })

  async function removeSelected() {
    if (!sel.size) return
    setBusy(true)
    try {
      const n = await deleteFavorites([...sel])
      toast.success(`관심 매물 ${n}건 삭제했습니다`)
      setSel(new Set())
      router.refresh()
    } catch (e) { toast.error(e instanceof Error ? e.message : "삭제 실패") }
    finally { setBusy(false) }
  }

  return (
    <Card className="gap-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2"><Star className="size-4" /> 관심 매물</CardTitle>
        <CardAction className="flex items-center gap-2">
          {sel.size > 0 && (
            <Button size="sm" variant="destructive" onClick={removeSelected} disabled={busy}>
              <Trash2 className="size-3.5" />선택 삭제 {sel.size}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">{favorites.length}개</span>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {favorites.length === 0 ? (
          <Empty className="border-0 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Star /></EmptyMedia>
              <EmptyTitle>관심 매물이 없습니다</EmptyTitle>
              <EmptyDescription>매물 수집에서 매물을 체크해 저장하면 여기에 모입니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={(c) => toggleAll(c)} aria-label="전체 선택" /></TableHead>
                  <TableHead className="w-12 text-right">#</TableHead>
                  <TableHead>매물명</TableHead><TableHead>유형</TableHead><TableHead>거래</TableHead><TableHead>가격</TableHead><TableHead>월세</TableHead><TableHead>전용</TableHead><TableHead>공급</TableHead><TableHead>층</TableHead><TableHead>동</TableHead><TableHead>중개사</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {favorites.map((a, i) => (
                  <TableRow key={a.articleNumber} data-state={sel.has(a.articleNumber) ? "selected" : undefined}>
                    <TableCell><Checkbox checked={sel.has(a.articleNumber)} onCheckedChange={(c) => toggleOne(a.articleNumber, c)} aria-label="선택" /></TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{favorites.length - i}</TableCell>
                    <TableCell className="font-medium">{a.name ?? "-"}</TableCell>
                    <TableCell>{PROPERTY_LABEL[a.realEstateType] ?? a.realEstateType}</TableCell>
                    <TableCell>{TRADE_LABEL[a.tradeType] ?? a.tradeType}</TableCell>
                    <TableCell>{won(a.price)}</TableCell>
                    <TableCell>{won(a.rentPrice)}</TableCell>
                    <TableCell>{a.areaExclusive ?? "-"}</TableCell>
                    <TableCell>{a.areaSupply ?? "-"}</TableCell>
                    <TableCell>{a.floor ?? "-"}</TableCell>
                    <TableCell>{a.dong ?? "-"}</TableCell>
                    <TableCell>{a.realtorName ?? "-"}</TableCell>
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
