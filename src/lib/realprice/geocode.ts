import { db } from "@/lib/db";

export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const c = await db.geocodeCache.findUnique({ where: { query } });
  if (c) return c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : null;
  const key = process.env.VWORLD_API_KEY ?? "";
  const url = new URL("https://api.vworld.kr/req/address");
  url.searchParams.set("service", "address");
  url.searchParams.set("request", "getcoord");
  url.searchParams.set("type", "road");
  url.searchParams.set("address", query);
  url.searchParams.set("key", key);
  url.searchParams.set("format", "json");
  let lat: number | null = null, lng: number | null = null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const j = await res.json() as { response?: { result?: { point?: { x: string; y: string } } } };
    const p = j?.response?.result?.point;
    if (p) { lat = Number(p.y); lng = Number(p.x); }
  } catch { /* 실패 시 null 캐시 */ }
  await db.geocodeCache.upsert({
    where: { query },
    create: { query, lat, lng },
    update: { lat, lng, fetchedAt: new Date() },
  });
  return lat != null && lng != null ? { lat, lng } : null;
}
