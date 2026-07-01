// API 키 조회 헬퍼 — 환경설정(DB SystemConfig) 우선, 빈값이면 process.env 폴백.
// 환경설정 페이지에서 키를 저장하면 재배포 없이 즉시 반영. 클라이언트에서 import 금지(서버 전용).
import { getConfig } from "@/lib/config/config-actions"

/**
 * @param key SystemConfig 키 (예: "kakaoMapKey")
 * @param envName 폴백 process.env 변수명 (예: "NEXT_PUBLIC_KAKAO_MAP_KEY")
 */
export async function getApiKey(key: string, envName: string): Promise<string> {
  const fromDb = await getConfig(key)
  return fromDb && fromDb.trim() !== "" ? fromDb : (process.env[envName] ?? "")
}
