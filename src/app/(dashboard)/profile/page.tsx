import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex flex-col gap-4">
      <ProfileForm user={{ name: user.name, phone: user.phone, email: user.email }} />
    </div>
  );
}
