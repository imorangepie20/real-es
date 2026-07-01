import { listProperties } from "./actions"
import { PropertyList } from "./property-list"

export const dynamic = "force-dynamic"

export default async function PropertiesPage() {
  const rows = await listProperties("all")
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">매물 관리</h1>
      <PropertyList rows={rows} view="all" />
    </div>
  )
}
