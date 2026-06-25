"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PARTY_LABEL, PARTIES } from "@/lib/properties/contract-checklist";
import { FIELD_BY_KEY, formMeta } from "@/lib/properties/fields";
import { groupDigits, stripDigits, toDateInput, fromDateInput } from "@/lib/properties/format";
import { updateProperty } from "../../actions";
import { toggleChecklistItem, completeContract, type ContractData } from "../../contract-actions";

export function ContractClient({ id, data, forms }: { id: string; data: ContractData; forms: { id: string; label: string }[] }) {
  const router = useRouter();
  const readOnly = data.status === "계약완료";
  const [checked, setChecked] = useState(data.checked);
  const [fieldFilled, setFieldFilled] = useState<Record<string, boolean>>(
    Object.fromEntries(data.requiredFields.map((f) => [f.key, f.filled])),
  );
  const [busy, setBusy] = useState(false);

  // 진행률은 파생값(state 아님) — 체크·필드 변경 시 즉시 반영
  const reqIds = data.checklist.filter((i) => i.required).map((i) => i.id);
  const doneItems = reqIds.filter((x) => checked[x]).length;
  const doneFields = Object.values(fieldFilled).filter(Boolean).length;
  const total = reqIds.length + data.requiredFields.length;
  const done = doneItems + doneFields;
  const complete = total > 0 && done === total;

  function onToggle(itemId: string, v: boolean) {
    if (readOnly) return;
    const next = { ...checked };
    if (v) next[itemId] = new Date().toISOString(); else delete next[itemId];
    setChecked(next);
    toggleChecklistItem(id, itemId, v).catch((e) => toast.error(e instanceof Error ? e.message : "저장 실패"));
  }

  async function onComplete() {
    setBusy(true);
    try { await completeContract(id); toast.success("계약완료로 전환했습니다"); router.push("/dashboard/properties"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "완료 처리 실패"); }
    finally { setBusy(false); }
  }

  const groups = PARTIES.map((p) => p.value);

  return (
    <div className="space-y-6">
      {readOnly && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          계약완료 매물입니다(읽기전용). 수정하려면 목록에서 상태를 하향하세요.
        </p>
      )}

      {/* 진행률 */}
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium">진행률</span>
          <span className="tabular-nums text-muted-foreground">{done}/{total}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>

      {/* ① 핵심 계약 데이터 */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">핵심 계약 데이터</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.requiredFields.map((f) => (
            <ContractField key={f.key} id={id} fieldKey={f.key} initial={data.property[f.key]} readOnly={readOnly}
              onFilled={(filled) => setFieldFilled((prev) => ({ ...prev, [f.key]: filled }))} />
          ))}
        </div>
      </section>

      {/* ② 서류 체크리스트 */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">서류 체크리스트</h3>
        {groups.map((party) => {
          const items = data.checklist.filter((i) => i.party === party);
          if (!items.length) return null;
          return (
            <div key={party} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{PARTY_LABEL[party]}</p>
              {items.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!checked[i.id]} onCheckedChange={(c) => onToggle(i.id, c)} disabled={readOnly} />
                  <span className={cn(checked[i.id] && "text-muted-foreground line-through")}>{i.label}</span>
                  {!i.required && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{i.kind === "신고" ? "법정신고" : "참고"}</span>}
                </label>
              ))}
            </div>
          );
        })}
      </section>

      {/* ③ 양식 인쇄 */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">양식 인쇄</h3>
        <div className="flex flex-wrap gap-2">
          {forms.map((f) => (
            <Button key={f.id} size="sm" variant="outline" render={<Link href={`/dashboard/properties/${id}/contract/print/${f.id}`} target="_blank" />}>
              <Printer className="size-3.5" />{f.label}
            </Button>
          ))}
        </div>
      </section>

      {/* 완료 */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          {!complete && <span className="text-sm text-muted-foreground">필수 항목·데이터를 모두 채우면 활성화됩니다.</span>}
          <Button onClick={onComplete} disabled={!complete || busy}>계약 완료 처리</Button>
        </div>
      )}
    </div>
  );
}

function ContractField({ id, fieldKey, initial, readOnly, onFilled }: {
  id: string; fieldKey: string; initial: unknown; readOnly: boolean; onFilled: (filled: boolean) => void;
}) {
  const f = FIELD_BY_KEY[fieldKey];
  const meta = formMeta(f);
  const [val, setVal] = useState(initial == null ? "" : String(initial));

  function save(raw: string) {
    onFilled(raw !== "");
    updateProperty(id, { [fieldKey]: raw }).catch((e) => toast.error(e instanceof Error ? e.message : "저장 실패"));
  }
  const display = meta.formInput === "money" ? groupDigits(val) : meta.formInput === "date" ? toDateInput(val) : val;
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{f.label}</span>
      {meta.formInput === "date" ? (
        <Input type="date" value={display} disabled={readOnly}
          onChange={(e) => { const v = fromDateInput(e.target.value); setVal(v); save(v); }} />
      ) : (
        <Input value={display} disabled={readOnly} inputMode={meta.formInput === "money" ? "numeric" : undefined}
          onChange={(e) => setVal(meta.formInput === "money" ? stripDigits(e.target.value) : e.target.value)}
          onBlur={(e) => save(meta.formInput === "money" ? stripDigits(e.target.value) : e.target.value)} />
      )}
    </label>
  );
}
