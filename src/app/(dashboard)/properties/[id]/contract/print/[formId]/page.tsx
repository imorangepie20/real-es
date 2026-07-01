import { notFound } from "next/navigation";

import { FORM_BY_ID } from "@/lib/properties/contract-forms";
import { getProperty } from "../../../../actions";
import { PrintButton } from "../print-button";
import { ContractDocument } from "../contract-document";

export default async function PrintFormPage({ params }: { params: Promise<{ id: string; formId: string }> }) {
  const { id, formId } = await params;
  const form = FORM_BY_ID[formId];
  const property = await getProperty(id); // requireUser + userId 스코프(IDOR 차단)
  if (!form || !property) notFound();

  return (
    <div className="min-h-screen bg-neutral-200 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex w-[210mm] max-w-full justify-end px-4 print:hidden">
        <PrintButton />
      </div>
      <div className="mx-auto w-fit shadow-xl print:w-auto print:shadow-none">
        <ContractDocument formId={formId} property={property as unknown as Record<string, unknown>} />
      </div>
    </div>
  );
}
