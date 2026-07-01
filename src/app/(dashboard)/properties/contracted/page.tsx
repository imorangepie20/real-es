import { listProperties } from "../actions"
import { PropertyList } from "../property-list"

export const dynamic = "force-dynamic"

export default async function ContractedPropertiesPage() {
  const rows = await listProperties("contracted")
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">계약완료</h1>
      <PropertyList rows={rows} view="contracted" />
    </div>
  )
}
