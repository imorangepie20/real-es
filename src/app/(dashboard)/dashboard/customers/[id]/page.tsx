import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) redirect("/login");
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  return <CustomerForm customer={customer} />;
}
