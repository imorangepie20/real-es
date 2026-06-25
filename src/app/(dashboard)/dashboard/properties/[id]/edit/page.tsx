import Link from "next/link"
import { notFound } from "next/navigation"
import { UserPlus } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { getProperty } from "../../actions"
import { PropertyForm } from "../../property-form"

export const dynamic = "force-dynamic"

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const property = await getProperty(id)
  if (!property) notFound()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">매물 수정</h1>
        <Link href={`/dashboard/customers/new?propertyId=${id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
          <UserPlus className="size-3.5" />고객으로 등록
        </Link>
      </div>
      <PropertyForm property={property} />
    </div>
  )
}
