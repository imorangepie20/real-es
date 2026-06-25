import { notFound } from "next/navigation";

import { FORM_BY_ID } from "@/lib/properties/contract-forms";
import { getProperty } from "../../../../actions";
import { PrintButton } from "../print-button";

const fmtMoney = (v: unknown) => (v == null || v === "" ? "" : Number(v).toLocaleString("ko-KR"));
const fmtDate = (v: unknown) => { const s = v == null ? "" : String(v); return s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : s; };
const MONEY = new Set(["dealAmount", "price", "rentPrice"]);
const DATE = new Set(["contractDate", "interim1Date", "interim2Date", "balanceDate", "moveInDate"]);

export default async function PrintFormPage({ params }: { params: Promise<{ id: string; formId: string }> }) {
  const { id, formId } = await params;
  const form = FORM_BY_ID[formId];
  const property = await getProperty(id); // requireUser + userId 스코프(IDOR 차단)
  if (!form || !property) notFound();

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-[15mm] text-black print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <h1 className="mb-6 text-center text-xl font-bold">{form.label}</h1>
      <p className="mb-6 text-center text-xs text-gray-500">실무 보조용 자동기입 양식 — 공식 표준양식 아님</p>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {form.slots.map((s, i) => {
            const raw = s.sourceKey ? property[s.sourceKey] : undefined;
            const val = s.sourceKey ? (MONEY.has(s.sourceKey) ? fmtMoney(raw) : DATE.has(s.sourceKey) ? fmtDate(raw) : (raw ?? "")) : "";
            return (
              <tr key={i} className="border border-gray-400">
                <th className="w-40 border border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">{s.slot}</th>
                <td className="px-3 py-2">{String(val) || <span className="text-gray-400">________________</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-8 text-center text-xs text-gray-500">{form.label} · 자동기입 항목 외에는 직접 기입하세요.</p>
    </div>
  );
}
