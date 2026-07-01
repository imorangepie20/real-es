import { notFound } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getMember, listAgencies } from "@/lib/members/members-actions"
import { MemberForm } from "../member-form"

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = await getMember(id)
  if (!member) notFound()
  const agencies = await listAgencies()
  const currentUser = await getCurrentUser()
  return <MemberForm member={member} agencies={agencies} isSelf={currentUser?.id === member.id} />
}
