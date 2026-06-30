import type { LucideIcon } from "lucide-react";
import {
  ClipboardList, Star, CircleDashed, CircleCheck, TrendingUp,
  Search, Users, Calendar, UserCog, Settings, ShieldCheck,
} from "lucide-react";

export type NavItem = { title: string; href: string; icon?: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "매물 관리",
    items: [
      { title: "전체 매물", href: "/dashboard/properties", icon: ClipboardList },
      { title: "관심 매물", href: "/dashboard/properties/favorites", icon: Star },
      { title: "계약 진행", href: "/dashboard/properties/progress", icon: CircleDashed },
      { title: "계약 완료", href: "/dashboard/properties/contracted", icon: CircleCheck },
    ],
  },
  {
    label: "국토부 실거래가",
    items: [
      { title: "실거래가 조회 및 통계", href: "/dashboard/realprice", icon: TrendingUp },
    ],
  },
  {
    label: "네이버 부동산",
    items: [
      { title: "매물 검색", href: "/dashboard/naver", icon: Search },
      { title: "관심 매물", href: "/dashboard/naver/favorites", icon: Star },
    ],
  },
  {
    label: "고객 관리",
    items: [
      { title: "고객 목록", href: "/dashboard/customers", icon: Users },
    ],
  },
  {
    label: "일정",
    items: [
      { title: "일정 관리", href: "/dashboard/calendar", icon: Calendar },
    ],
  },
  {
    label: "설정",
    items: [
      // 미구현 — 빈 링크 (페이지 준비되면 href 연결)
      { title: "회원 관리", href: "#", icon: UserCog },
      { title: "환경 설정", href: "/settings", icon: Settings },
      // 미구현 — 빈 링크
      { title: "권한 관리", href: "#", icon: ShieldCheck },
    ],
  },
];

// Auth routes live outside the dashboard shell (the (auth) group).
export const authRoutes: NavItem[] = [
  { title: "Login", href: "/login" },
  { title: "Register", href: "/register" },
  { title: "Forgot Password", href: "/forgot-password" },
  { title: "Reset Password", href: "/reset-password" },
  { title: "Verify Email", href: "/verify" },
];

// Flat list of every dashboard-shell route (used by ⌘K and stub generation).
export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);
