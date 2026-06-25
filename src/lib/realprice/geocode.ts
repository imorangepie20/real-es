import { db } from "@/lib/db";

type VWorldResp = { response?: { status?: string; result?: { point?: { x: string; y: string } } } };

// 주소 문자열 → 좌표. GeocodeCache 우선, 실패도 null로 캐시(VWorld 재호출 방지).
// 실거래 주소는 지번이 대부분이라 parcel(지번)→road(도로명) 순으로 시도.
export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const cached = await db.geocodeCache.findUnique({ where: { query } });
  if (cached) return cached.lat != null && cached.lng != null ? { lat: cached.lat, lng: cached.lng } : null;

  const key = process.env.VWORLD_API_KEY ?? "";
  let lat: number | null = null, lng: number | null = null;
  for (const type of ["parcel", "road"] as const) {
    try {
      const url = new URL("https://api.vworld.kr/req/address");
      url.searchParams.set("service", "address");
      url.searchParams.set("request", "getcoord");
      url.searchParams.set("type", type);
      url.searchParams.set("address", query);
      url.searchParams.set("key", key);
      url.searchParams.set("format", "json");
      const res = await fetch(url, { cache: "no-store" });
      const j = (await res.json()) as VWorldResp;
      const p = j?.response?.result?.point;
      if (p && p.x && p.y) { lat = Number(p.y); lng = Number(p.x); break; }
    } catch (e) {
      console.warn(`[geocode] ${type} 예외 "${query}":`, String(e));
    }
  }
  if (lat == null) console.warn(`[geocode] 좌표 없음: "${query}"`);

  await db.geocodeCache.upsert({
    where: { query },
    create: { query, lat, lng },
    update: { lat, lng, fetchedAt: new Date() },
  });
  return lat != null && lng != null ? { lat, lng } : null;
}
