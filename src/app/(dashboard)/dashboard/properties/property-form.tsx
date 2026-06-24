"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { FORM_GROUPS, PROPERTY_FIELDS, type PropertyField } from "@/lib/properties/fields"
import { createProperty, updateProperty, type PropertyRow } from "./actions"

export function PropertyForm({ property }: { property?: PropertyRow }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of PROPERTY_FIELDS) {
      const v = property?.[f.key]
      init[f.key] = v == null ? (f.key === "status" ? "진행" : "") : f.type === "bool" ? (v ? "true" : "") : String(v)
    }
    return init
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const f of PROPERTY_FIELDS) payload[f.key] = f.type === "bool" ? values[f.key] === "true" : values[f.key]
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
          {FORM_GROUPS.map((group) => (
            <FieldSet key={group}>
              <FieldLegend variant="label">{group}</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PROPERTY_FIELDS.filter((f) => f.group === group).map((f) => (
                  <FieldInput key={f.key} field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
                ))}
              </FieldGroup>
            </FieldSet>
          ))}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          <Button type="submit" disabled={busy}>{property ? "수정" : "등록"}</Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function FieldInput({ field, value, onChange }: { field: PropertyField; value: string; onChange: (v: string) => void }) {
  if (field.type === "bool") {
    return (
      <Field orientation="horizontal">
        <Checkbox id={field.key} checked={value === "true"} onCheckedChange={(c) => onChange(c ? "true" : "")} />
        <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
      </Field>
    )
  }
  return (
    <Field>
      <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
      {field.type === "select" ? (
        <NativeSelect className="w-full" id={field.key} value={value} onChange={(e) => onChange(e.target.value)}>
          <NativeSelectOption value="">선택</NativeSelectOption>
          {(field.options ?? []).map((o) => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
        </NativeSelect>
      ) : (
        <Input
          id={field.key}
          type={field.type === "number" || field.type === "money" || field.type === "area" ? "number" : "text"}
          inputMode={field.type === "money" || field.type === "number" ? "numeric" : undefined}
          placeholder={field.type === "date" ? "YYYYMMDD" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  )
}
