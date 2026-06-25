import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { listCustomers } from "./actions";
import { CustomerList } from "./customer-list";

export default async function CustomersPage() {
  if (!(await getCurrentUser())) redirect("/login");
  const rows = await listCustomers();
  return <CustomerList initial={rows} />;
}
