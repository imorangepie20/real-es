import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard/real-estate");

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
