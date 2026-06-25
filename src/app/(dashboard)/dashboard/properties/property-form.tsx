"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { FORM_GROUPS, PROPERTY_FIELDS, SPAN_CLASS, formMeta, type PropertyField } from "@/lib/properties/fields"
import { fromDateInput, groupDigits, stripDigits, formatTel, toDateInput } from "@/lib/properties/format"
import { createProperty, updateProperty, type PropertyRow } from "./actions"

const RENTAL = new Set(["B1", "B2"]) // 전세·월세 → price를 "보증금"으로

export function PropertyForm({ property }: { property?: PropertyRow }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of PROPERTY_FIELDS) {
      const v = property?.[f.key]
      init[f.key] = v == null ? (f.key === "status" ? "진행" : "") : f.type === "bool" ? (v ? "true" : "") : f.type === "money" ? String(Number(v) / 10000) : String(v)
    }
    return init
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }))

  const isRental = RENTAL.has(values.tradeType)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const f of PROPERTY_FIELDS) {
        if (formMeta(f).formHidden) continue
        payload[f.key] = f.type === "bool" ? values[f.key] === "true" : values[f.key]
      }
      if (property) { await updateProperty(property.id, payload); toast.success("수정했습니다") }
      else { await createProperty(payload); toast.success("등록했습니다") }
      router.push("/dashboard/properties")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패")
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle>{property ? "매물 수정" : "매물 등록"}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-6">
          {FORM_GROUPS.map((group) => {
            const fields = PROPERTY_FIELDS.filter((f) => f.group === group && !formMeta(f).formHidden)
            if (fields.length === 0) return null
            return (
              <FieldSet key={group}>
                <FieldLegend variant="label">{group}</FieldLegend>
                <div className="grid grid-cols-12 gap-4">
                  {fields.map((f) => {
                    const m = formMeta(f)
                    // 거래유형 연동: price 라벨/강조
                    const label = f.key === "price" ? (isRental ? "보증금" : "가격") : f.label
                    return (
                      <div key={f.key} className={SPAN_CLASS[m.span]}>
                        <FieldInput field={f} meta={m} label={label} value={values[f.key]} onChange={(v) => set(f.key, v)} />
                      </div>
                    )
                  })}
                </div>
              </FieldSet>
            )
          })}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          <Button type="submit" disabled={busy}>{property ? "수정" : "등록"}</Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function FieldInput({ field, meta, label, value, onChange }: {
  field: PropertyField
  meta: ReturnType<typeof formMeta>
  label: string
  value: string
  onChange: (v: string) => void
}) {
  if (meta.formInput === "bool") {
    return (
      <Field orientation="horizontal">
        <Checkbox id={field.key} checked={value === "true"} onCheckedChange={(c) => onChange(c ? "true" : "")} />
        <FieldLabel htmlFor={field.key}>{label}</FieldLabel>
      </Field>
    )
  }
  return (
    <Field>
      <FieldLabel htmlFor={field.key}>{label}</FieldLabel>
      {meta.formInput === "select" ? (
        <NativeSelect className="w-full" id={field.key} value={value} onChange={(e) => onChange(e.target.value)}>
          <NativeSelectOption value="">선택</NativeSelectOption>
          {(field.options ?? []).map((o) => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
        </NativeSelect>
      ) : meta.formInput === "textarea" ? (
        <Textarea id={field.key} value={value} onChange={(e) => onChange(e.target.value)} placeholder={meta.placeholder} rows={2} />
      ) : meta.formInput === "date" ? (
        <Input id={field.key} type="date" value={toDateInput(value)} onChange={(e) => onChange(fromDateInput(e.target.value))} />
      ) : meta.formInput === "tel" ? (
        <Input id={field.key} type="tel" inputMode="tel" value={value} onChange={(e) => onChange(formatTel(e.target.value))} placeholder={meta.placeholder} />
      ) : meta.formInput === "money" ? (
        <InputGroup>
          <InputGroupInput id={field.key} inputMode="numeric" className="text-right tabular-nums" placeholder="0" value={groupDigits(value)} onChange={(e) => onChange(stripDigits(e.target.value))} />
          <InputGroupAddon align="inline-end"><InputGroupText>{meta.unit}</InputGroupText></InputGroupAddon>
        </InputGroup>
      ) : meta.formInput === "area" || meta.formInput === "count" ? (
        <InputGroup>
          <InputGroupInput id={field.key} type="number" inputMode={meta.formInput === "area" ? "decimal" : "numeric"} className="text-right tabular-nums" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} />
          {meta.unit && <InputGroupAddon align="inline-end"><InputGroupText>{meta.unit}</InputGroupText></InputGroupAddon>}
        </InputGroup>
      ) : (
        <Input id={field.key} value={value} onChange={(e) => onChange(e.target.value)} placeholder={meta.placeholder} />
      )}
    </Field>
  )
}
