import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getSidos } from "@/app/(dashboard)/dashboard/naver/actions";
import { RealpriceView } from "./realprice-view";

export default async function RealpricePage() {
  if (!(await getCurrentUser())) redirect("/login");
  const sidos = await getSidos();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">실거래가 조회</h1>
      <RealpriceView sidos={sidos} />
    </div>
  );
}
