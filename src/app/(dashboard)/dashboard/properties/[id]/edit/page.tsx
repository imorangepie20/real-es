import { notFound } from "next/navigation"

import { getProperty } from "../../actions"
import { PropertyForm } from "../../property-form"

export const dynamic = "force-dynamic"

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const property = await getProperty(id)
  if (!property) notFound()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">매물 수정</h1>
      <PropertyForm property={property} />
    </div>
  )
}
