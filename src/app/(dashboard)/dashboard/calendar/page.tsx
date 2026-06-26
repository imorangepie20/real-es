import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { CalendarView } from "./calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ y?: string; m?: string; d?: string }> }) {
  if (!(await getCurrentUser())) redirect("/login");
  const sp = await searchParams;
  const y = Number(sp.y);
  const m = Number(sp.m);
  const initialView =
    Number.isInteger(y) && y > 1900 && Number.isInteger(m) && m >= 0 && m <= 11 ? { year: y, month: m } : null;
  const initialDate = sp.d && /^\d{8}$/.test(sp.d) ? sp.d : null;
  return <CalendarView initialView={initialView} initialDate={initialDate} />;
}
