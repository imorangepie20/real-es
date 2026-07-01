"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { formatTel } from "@/lib/properties/format"
import { PARTY_TYPES } from "@/lib/customers/types"
import { addParty, removeParty, type PartyRow } from "./party-actions"

export function PropertyParties({ propertyId, initial }: { propertyId: string; initial: PartyRow[] }) {
  const router = useRouter()
  const [role, setRole] = useState<string>(PARTY_TYPES[0])
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim()) { toast.error("고객 이름을 입력하세요"); return }
    setBusy(true)
    try {
      await addParty(propertyId, role, name, phone)
      toast.success("당사자를 추가했습니다")
      setName(""); setPhone("")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "추가에 실패했습니다")
    } finally { setBusy(false) }
  }

  async function remove(id: string) {
    setBusy(true)
    try {
      await removeParty(id)
      toast.success("삭제했습니다")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다")
    } finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="size-4" />당사자 (매도인·매수인·임대인·임차인)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {initial.length > 0 ? (
          <div className="flex flex-col gap-2">
            {initial.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Badge variant="secondary" className="shrink-0">{p.role}</Badge>
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{p.phone || "-"}</span>
                <Button size="icon" variant="ghost" className="ml-auto" onClick={() => remove(p.id)} disabled={busy} aria-label="삭제">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">아직 연결된 당사자가 없습니다. 아래에서 추가하세요.</p>
        )}

        <div className="flex flex-wrap items-end gap-2 border-t pt-4">
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value)} className="w-28">
            {PARTY_TYPES.map((t) => <NativeSelectOption key={t} value={t}>{t}</NativeSelectOption>)}
          </NativeSelect>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="w-32" />
          <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatTel(e.target.value))} placeholder="전화번호" className="w-40" />
          <Button type="button" onClick={add} disabled={busy}><Plus className="size-3.5" />추가</Button>
        </div>
      </CardContent>
    </Card>
  )
}
