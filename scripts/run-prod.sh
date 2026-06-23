#!/usr/bin/env bash
# 프로덕션 모드로 앱 실행 (Cloudflare 터널 접속용).
# 터널(다른 origin)에서는 next dev가 HMR/origin 마찰이 있어 dev 대신 이걸 쓴다.
#   - serverActions.allowedOrigins / allowedDevOrigins 는 next.config.ts에 설정됨
#
# 사용:
#   bash scripts/run-prod.sh                 # 포그라운드 (Ctrl+C로 종료)
#   nohup bash scripts/run-prod.sh > prod.log 2>&1 &   # 백그라운드 (SSH 끊겨도 유지)
#
# 환경변수:
#   PORT (기본 3001)
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3001}"

# 1) 기존 PORT 점유 서버 종료
PID="$(ss -ltnp 2>/dev/null | grep ":${PORT} " | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
if [ -n "${PID}" ]; then
  echo "[run-prod] 기존 ${PORT} 서버 종료 (pid ${PID})"
  kill "${PID}" 2>/dev/null || true
  sleep 2
fi

# 2) Prisma 클라이언트 최신화 (마이그레이션 반영 — 오래된 클라이언트로 인한 런타임 오류 방지)
echo "[run-prod] prisma generate"
pnpm prisma generate

# 3) 프로덕션 빌드
echo "[run-prod] build"
pnpm build

# 4) 프로덕션 서버 기동 (next start -p ${PORT})
echo "[run-prod] start :${PORT}  →  https://resm.approid.team"
PORT="${PORT}" pnpm exec next start -p "${PORT}"
