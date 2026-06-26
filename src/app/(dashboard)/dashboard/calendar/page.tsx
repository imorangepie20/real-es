import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { CalendarView } from "./calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  if (!(await getCurrentUser())) redirect("/login");
  return <CalendarView />;
}
