// 법정동(시도/시군구/읍면동) VWorld 적재 → LegalDivision
// 실행: node --env-file=.env scripts/seed-legal-divisions.mjs
import { PrismaClient } from "@prisma/client";

const KEY = process.env.VWORLD_API_KEY;
const DOMAIN = "https://resm.approid.team";
const BASE = "https://api.vworld.kr/req/data";
const KOREA_BBOX = "BOX(124,33,132,43)";

const db = new PrismaClient();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function vworld(layer, { geomFilter, attrFilter, page = 1, size = 1000 }) {
  const params = new URLSearchParams({
    service: "data", version: "2.0", request: "GetFeature", format: "json",
    crs: "EPSG:4326", size: String(size), page: String(page),
    data: layer, key: KEY, domain: DOMAIN,
  });
  if (geomFilter) params.set("geomFilter", geomFilter);
  if (attrFilter) params.set("attrFilter", attrFilter);

  const res = await fetch(`${BASE}?${params}`);
  const json = await res.json();
  const r = json.response;
  if (r.status === "NOT_FOUND") return { features: [], totalPages: 0 };
  if (r.status !== "OK") throw new Error(`VWorld ${layer} ${r.status}: ${JSON.stringify(r.error)}`);
  const features = r.result?.featureCollection?.features ?? [];
  const totalPages = parseInt(r.page?.total ?? "1", 10) || 1;
  return { features, totalPages };
}

async function fetchAll(layer, opts) {
  const first = await vworld(layer, { ...opts, page: 1 });
  let all = first.features;
  for (let p = 2; p <= first.totalPages; p++) {
    await sleep(150);
    const more = await vworld(layer, { ...opts, page: p });
    all = all.concat(more.features);
  }
  return all;
}

// 대표 좌표 = 첫 폴리곤 외곽링 정점 평균
function centroid(geometry) {
  try {
    const ring = geometry.type === "MultiPolygon" ? geometry.coordinates[0][0]
      : geometry.type === "Polygon" ? geometry.coordinates[0] : null;
    if (!ring?.length) return { lng: null, lat: null };
    let sx = 0, sy = 0;
    for (const [x, y] of ring) { sx += x; sy += y; }
    return { lng: sx / ring.length, lat: sy / ring.length };
  } catch { return { lng: null, lat: null }; }
}

async function main() {
  if (!KEY) throw new Error("VWORLD_API_KEY 없음 (.env)");
  const t0 = Date.now();

  // 1) 시도
  const sidos = await fetchAll("LT_C_ADSIDO_INFO", { geomFilter: KOREA_BBOX });
  const sidoName = {};
  for (const f of sidos) {
    const p = f.properties, c = centroid(f.geometry);
    sidoName[p.ctprvn_cd] = p.ctp_kor_nm;
    await db.legalDivision.upsert({
      where: { code: p.ctprvn_cd },
      create: { code: p.ctprvn_cd, level: "SIDO", name: p.ctp_kor_nm, fullName: p.ctp_kor_nm, sidoCode: p.ctprvn_cd, lng: c.lng, lat: c.lat },
      update: { name: p.ctp_kor_nm, fullName: p.ctp_kor_nm, lng: c.lng, lat: c.lat },
    });
  }
  console.log(`[시도] ${sidos.length}`);

  // 2) 시군구
  const siggs = await fetchAll("LT_C_ADSIGG_INFO", { geomFilter: KOREA_BBOX });
  for (const f of siggs) {
    const p = f.properties, c = centroid(f.geometry);
    const sido = p.sig_cd.slice(0, 2);
    const full = p.full_nm || `${sidoName[sido] ?? ""} ${p.sig_kor_nm}`.trim();
    await db.legalDivision.upsert({
      where: { code: p.sig_cd },
      create: { code: p.sig_cd, level: "SIGUNGU", name: p.sig_kor_nm, fullName: full, sidoCode: sido, lng: c.lng, lat: c.lat },
      update: { name: p.sig_kor_nm, fullName: full, sidoCode: sido, lng: c.lng, lat: c.lat },
    });
  }
  console.log(`[시군구] ${siggs.length}`);

  // 3) 읍면동 (시군구별 attrFilter)
  let emdTotal = 0, done = 0;
  for (const f of siggs) {
    const sig = f.properties.sig_cd;
    await sleep(120);
    let emds;
    try {
      emds = await fetchAll("LT_C_ADEMD_INFO", { attrFilter: `emd_cd:like:${sig}` });
    } catch (e) {
      console.log(`  ! ${sig} ${f.properties.sig_kor_nm} 실패: ${e.message}`);
      continue;
    }
    for (const e of emds) {
      const p = e.properties, c = centroid(e.geometry);
      await db.legalDivision.upsert({
        where: { code: p.emd_cd },
        create: { code: p.emd_cd, level: "EMD", name: p.emd_kor_nm, fullName: p.full_nm, sidoCode: p.emd_cd.slice(0, 2), sigunguCode: p.emd_cd.slice(0, 5), naverCode: p.emd_cd + "00", lng: c.lng, lat: c.lat },
        update: { name: p.emd_kor_nm, fullName: p.full_nm, sigunguCode: p.emd_cd.slice(0, 5), naverCode: p.emd_cd + "00", lng: c.lng, lat: c.lat },
      });
    }
    emdTotal += emds.length;
    if (++done % 30 === 0) console.log(`  ...읍면동 진행 ${done}/${siggs.length} 시군구, 누적 ${emdTotal}`);
  }
  console.log(`[읍면동] ${emdTotal}`);
  console.log(`완료 (${Math.round((Date.now() - t0) / 1000)}s)`);

  await db.$disconnect();
}

main().catch(async (e) => { console.error("SEED ERROR:", e); await db.$disconnect(); process.exit(1); });
