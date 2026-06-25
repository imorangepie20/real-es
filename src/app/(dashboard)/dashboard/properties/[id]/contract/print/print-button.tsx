"use client";
import { Button } from "@/components/ui/button";
export function PrintButton() {
  return (
    <Button size="sm" className="print:hidden" onClick={() => window.print()}>인쇄 / PDF 저장</Button>
  );
}
