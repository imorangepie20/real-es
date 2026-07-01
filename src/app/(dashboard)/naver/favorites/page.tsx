import { listFavorites } from "../actions";
import { FavoritesView } from "./favorites-view";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const favorites = await listFavorites();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">관심 매물</h1>
      <FavoritesView favorites={favorites} />
    </div>
  );
}
