import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare 터널(리얼 도메인)로 dev/앱에 접속하므로, 다른 origin에서의
  // dev 자원(HMR 등)과 서버 액션을 허용한다. 없으면 하이드레이션/서버액션이 막힌다.
  allowedDevOrigins: ["resm.approid.team"],
  experimental: {
    serverActions: {
      allowedOrigins: ["resm.approid.team"],
    },
  },
};

export default nextConfig;
