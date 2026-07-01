import { listAgencies } from "@/lib/members/members-actions"
import { MemberForm } from "../member-form"

export default async function NewMemberPage() {
  const agencies = await listAgencies()
  return <MemberForm agencies={agencies} />
}
