import { listProperties } from "../actions"
import { PropertyList } from "../property-list"

export const dynamic = "force-dynamic"

export default async function InProgressPropertiesPage() {
  const rows = await listProperties("in-progress")
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">계약진행</h1>
      <PropertyList rows={rows} view="in-progress" />
    </div>
  )
}
