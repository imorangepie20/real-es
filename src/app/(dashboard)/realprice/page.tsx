import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getApiKey } from "@/lib/config/keys";
import { getSidos } from "@/app/(dashboard)/naver/actions";
import { RealpriceView } from "./realprice-view";

export default async function RealpricePage() {
  if (!(await getCurrentUser())) redirect("/login");
  const sidos = await getSidos();
  const kakaoKey = await getApiKey("kakaoMapKey", "NEXT_PUBLIC_KAKAO_MAP_KEY");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">실거래가 조회</h1>
      <RealpriceView sidos={sidos} kakaoKey={kakaoKey} />
    </div>
  );
}
