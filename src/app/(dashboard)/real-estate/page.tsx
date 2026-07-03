import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getHomeData } from "@/lib/home/queries";
import { HomeView } from "./home-view";

export default async function RealEstatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getHomeData(user);
  return <HomeView data={data} />;
}
