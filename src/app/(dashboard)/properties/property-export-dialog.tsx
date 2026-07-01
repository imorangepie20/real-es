"use client"

import { useState } from "react"
import { Download } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { FORM_GROUPS, LIST_COLUMNS, PROPERTY_FIELDS } from "@/lib/properties/fields"
import type { PropertyView } from "./actions"

export function PropertyExportDialog({ view, fType, fTrade, fStatus }: { view: PropertyView; fType: string; fTrade: string; fStatus: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set(LIST_COLUMNS))
  const toggle = (k: string, c: boolean) => setSel((prev) => { const next = new Set(prev); if (c) next.add(k); else next.delete(k); return next })

  const qp = new URLSearchParams()
  qp.set("view", view)
  if (fType !== "ALL") qp.set("realEstateType", fType)
  if (fTrade !== "ALL") qp.set("tradeType", fTrade)
  if (fStatus !== "ALL") qp.set("status", fStatus)
  qp.set("fields", PROPERTY_FIELDS.filter((f) => sel.has(f.key)).map((f) => f.key).join(","))
  const url = `/api/properties/export?${qp.toString()}`

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Download className="size-3.5" />엑셀
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>엑셀 다운로드</DialogTitle>
          <DialogDescription>내보낼 필드를 선택하세요. 현재 필터가 함께 적용됩니다.</DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-auto">
          {FORM_GROUPS.map((group) => (
            <div key={group} className="mb-3">
              <p className="mb-1.5 text-sm font-medium text-muted-foreground">{group}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PROPERTY_FIELDS.filter((f) => f.group === group).map((f) => (
                  <Label key={f.key} className="flex items-center gap-2 font-normal">
                    <Checkbox checked={sel.has(f.key)} onCheckedChange={(c) => toggle(f.key, c)} />
                    {f.label}
                  </Label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <DialogClose render={<a href={url} className={cn(buttonVariants(), sel.size === 0 && "pointer-events-none opacity-50")} />}>
            <Download className="size-4" />다운로드
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
