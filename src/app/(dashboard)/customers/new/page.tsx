import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { customerDraftFromProperty } from "../actions";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  if (!(await getCurrentUser())) redirect("/login");
  const { propertyId } = await searchParams;
  const draft = propertyId ? await customerDraftFromProperty(propertyId) : null;
  return <CustomerForm draft={draft ?? undefined} />;
}
