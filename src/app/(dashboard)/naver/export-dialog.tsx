"use client"

import { useState } from "react"
import { Download } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { EXCEL_FIELDS } from "@/lib/naver/excel-fields"

export function ExportDialog({ exportHref }: { exportHref: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set(EXCEL_FIELDS.map((f) => f.key)))
  const toggle = (k: string, c: boolean) => setSel((prev) => { const next = new Set(prev); if (c) next.add(k); else next.delete(k); return next })
  const url = `${exportHref}&fields=${EXCEL_FIELDS.filter((f) => sel.has(f.key)).map((f) => f.key).join(",")}`

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>
        <Download className="size-3.5" />엑셀
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>엑셀 다운로드</DialogTitle>
          <DialogDescription>내보낼 필드를 선택하세요.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {EXCEL_FIELDS.map((f) => (
            <Label key={f.key} className="flex items-center gap-2 font-normal">
              <Checkbox checked={sel.has(f.key)} onCheckedChange={(c) => toggle(f.key, c)} />
              {f.header}
            </Label>
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
