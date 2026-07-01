import { listProperties } from "../actions"
import { PropertyList } from "../property-list"

export const dynamic = "force-dynamic"

export default async function FavoritePropertiesPage() {
  const rows = await listProperties("favorites")
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">관심 매물</h1>
      <PropertyList rows={rows} view="favorites" />
    </div>
  )
}
