/** "VAR_NAME=value" 형태(.env 라인 복붙)로 저장된 값 정제 — value만 추출.
 *  카카오·공공데이터·VWorld 키 자체엔 '='이 없으므로, '=' 앞이 대문자_변수명
 *  패턴이면 접두사로 간주해 제거. 순수 함수(서버/클라 공용). */
export function cleanEnvValue(raw: string): string {
  const v = raw.trim();
  const eq = v.indexOf("=");
  if (eq < 0) return v;
  return /^[A-Z][A-Z0-9_]*$/.test(v.slice(0, eq)) ? v.slice(eq + 1).trim() : v;
}
