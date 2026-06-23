import { getSidos } from "./actions";
import { CollectionView } from "./collection-view";

export default async function NaverPage() {
  const sidos = await getSidos();
  const kakaoKey = process.env.KAKAO_MAP_KEY ?? "";
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">매물 수집</h1>
      <CollectionView sidos={sidos} kakaoKey={kakaoKey} />
    </div>
  );
}
