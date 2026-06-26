"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatTel } from "@/lib/properties/format"
import { CUSTOMER_TYPES, GENDERS } from "@/lib/customers/types"
import { createCustomer, updateCustomer, type CustomerRow } from "./actions"
import { PostcodeSearch } from "./postcode-search"

type Draft = { name: string; phone: string; propertyId: string; propertyLabel: string }

export function CustomerForm({ customer, draft }: { customer?: CustomerRow; draft?: Draft }) {
  const router = useRouter()
  const [name, setName] = useState(customer?.name ?? draft?.name ?? "")
  const [phone, setPhone] = useState(customer?.phone ?? draft?.phone ?? "")
  const [address, setAddress] = useState(customer?.address ?? "")
  const [zipcode, setZipcode] = useState(customer?.zipcode ?? "")
  const [email, setEmail] = useState(customer?.email ?? "")
  const [gender, setGender] = useState(customer?.gender ?? "미지정")
  const [memo, setMemo] = useState(customer?.memo ?? "")
  const [types, setTypes] = useState<string[]>(customer?.types?.length ? customer.types : ["단순방문"])
  const [saving, setSaving] = useState(false)

  const propertyId = customer?.propertyId ?? draft?.propertyId ?? null
  const propertyLabel = customer?.propertyName ?? draft?.propertyLabel ?? null

  // 단순방문은 단독, 나머지는 복수.
  function toggleType(t: string) {
    if (t === "단순방문") { setTypes(["단순방문"]); return }
    const next = types.filter((x) => x !== "단순방문")
    setTypes(next.includes(t) ? next.filter((x) => x !== t) : [...next, t])
  }

  async function save() {
    if (!name.trim()) { toast.error("이름을 입력하세요"); return }
    setSaving(true)
    const input = { name, zipcode, phone, address, email, gender, memo, types, propertyId }
    try {
      if (customer) await updateCustomer(customer.id, input)
      else await createCustomer(input)
      toast.success(customer ? "수정했습니다" : "등록했습니다")
      router.push("/dashboard/customers")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다")
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{customer ? "고객 수정" : "새 고객"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-6">
        {propertyLabel && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            출처 매물: <span className="font-medium text-foreground">{propertyLabel}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>고객유형</Label>
          <div className="flex flex-wrap gap-2">
            {CUSTOMER_TYPES.map((t) => {
              const on = types.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
                  )}
                >
                  {t}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">매도인·매수인·임대인·임차인은 복수 선택, 단순방문은 단독.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="이름" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
          </Field>
          <Field label="전화번호">
            <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatTel(e.target.value))} placeholder="010-0000-0000" />
          </Field>
          <Field label="이메일">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="성별">
            <RadioGroup value={gender} onValueChange={(v) => { if (v != null) setGender(v) }} className="flex h-9 flex-row items-center gap-4">
              {GENDERS.map((g) => (
                <div key={g} className="flex items-center gap-1.5">
                  <RadioGroupItem value={g} id={`gender-${g}`} />
                  <Label htmlFor={`gender-${g}`} className="cursor-pointer font-normal">{g}</Label>
                </div>
              ))}
            </RadioGroup>
          </Field>
          <Field label="우편번호" className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <Input value={zipcode} readOnly placeholder="우편번호" className="w-32" />
              <PostcodeSearch onComplete={({ zonecode, address: addr }) => { setZipcode(zonecode); setAddress(addr); }} />
            </div>
          </Field>
          <Field label="주소" className="sm:col-span-2">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="도로명주소 + 상세주소(동/호)" />
          </Field>
          <Field label="메모" className="sm:col-span-2">
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} placeholder="상담 내용·특이사항" />
          </Field>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="outline" onClick={() => router.push("/dashboard/customers")}>
          <ArrowLeft className="size-3.5" />취소
        </Button>
        <Button onClick={save} disabled={saving}>
          <Save className="size-3.5" />{saving ? "저장 중" : "저장"}
        </Button>
      </CardFooter>
    </Card>
  )
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  )
}
