import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listNotifications } from "@/lib/notifications/actions";
import { NotificationsView } from "./notifications-view";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const items = await listNotifications();
  return <NotificationsView initial={items} />;
}
