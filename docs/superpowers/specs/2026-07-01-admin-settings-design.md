# 설정 메뉴 설계 (슈퍼 어드민 전용)

**작성일**: 2026-07-01
**상태**: 승인 완료

---

## 1. 개요

부동산 중개사무소용 웹앱 RESM의 설정 메뉴를 슈퍼 어드민 전용 기능으로 구현한다.

- **회원 관리**: 사용자 CRUD, 역할 관리
- **환경 설정**: 사이트 기본 정보, API 키 관리
- **권한 관리**: 향후 RBAC를 위한 플레이스홀더

---

## 2. 권한 모델

### User.role 값

| 값 | 설명 | 접근 범위 |
|----|------|----------|
| `superadmin` | 슈퍼 어드민 | 설정 메뉴 포함 전체 접근 |
| `member` | 일반 사용자 | 설정 메뉴 제외 |

### 최초 슈퍼 어드민 생성

`(auth)/actions.ts` 회원가입 로직:
```typescript
const userCount = await db.user.count();
const role = userCount === 0 ? "superadmin" : "member";
```

DB가 비어있을 때 첫 가입자가 자동으로 superadmin이 된다.

---

## 3. 데이터 모델

### SystemConfig (신규)

```prisma
model SystemConfig {
  id          String   @id @default(cuid())
  key         String   @unique  // "siteName" | "contactEmail" | "kakaoMapKey" ...
  value       String            // 설정값
  category    String            // "site" | "api"
  updatedAt   DateTime @updatedAt
  updatedAtBy String?           // 수정한 User.id

  @@index([category])
}
```

### 초기 설정값

| key | category | 초기값 |
|-----|----------|--------|
| siteName | site | RESM |
| contactEmail | site | (빈값) |
| contactPhone | site | (빈값) |
| kakaoMapKey | api | (빈값) |
| vworldKey | api | (빈값) |
| publicDataApiKey | api | (빈값) |

---

## 4. 페이지 구조

```
/dashboard/settings/
├── layout.tsx            # superadmin 가드 + 설정 전용 사이드바
├── page.tsx              # 설정 메인 (개요/링크)
├── members/
│   ├── page.tsx         # 회원 목록
│   └── [id]/
│       └── page.tsx     # 회원 상세/수정
├── environment/
│   └── page.tsx         # 환경 설정 (사이트 정보 + API 키)
└── permissions/
    └── page.tsx         # 권한 관리 (플레이스홀더)
```

---

## 5. 회원 관리 (/members)

### 목록

| 컬럼 | 설명 |
|------|------|
| 체크박스 | 전체선택 |
| 이름 | 사용자명 |
| 이메일 | 이메일 주소 |
| 소속 | Agency.name |
| 역할 | 배지 (member / superadmin) |
| 생성일 | YYYY.MM.DD |
| 작업 | 수정/삭제 드롭다운 |

### 기능

- **필터**: Agency, Role, Search (이름/이메일)
- **생성**: Agency 선택, 이메일, 비밀번호, 이름, 역할
- **수정**: 역할 변경 (member ↔ superadmin)
- **삭제**: 계정 삭제

---

## 6. 환경 설정 (/environment)

### 사이트 기본 정보 (카테고리: site)

- 사이트명 (텍스트)
- 연락처 이메일 (이메일)
- 연락처 전화 (전화)

### API 키 (카테고리: api)

- Kakao 지도 API 키 (텍스트)
- VWorld API 키 (텍스트)
- 공공데이터 API 키 (텍스트)

### 저장 방식

- DB `SystemConfig` 테이블에 저장
- 런타임에 직접 참조 (`.env`와 별개)
- 서버 액션에서 `updateConfigs()`로 일괄 업데이트

---

## 7. 권한 관리 (/permissions)

**플레이스홀더 페이지**: "준비 중입니다" 메시지 표시

향후 역할별 메뉴/기능 권한 설정 예정.

---

## 8. 서버 액션

### 회원 관리 (`lib/members/members-actions.ts`)

```typescript
listMembers(filters?: { agencyId?, role?, search? })
createMember(data: { agencyId, email, password, name, role })
updateMember(id, data: { role? })
resetMemberPassword(id, newPassword)
deleteMember(id)
```

### 환경 설정 (`lib/config/config-actions.ts`)

```typescript
listConfigs()
getConfigsByCategory(category: "site" | "api")
updateConfigs(updates: { key: string, value: string }[])
```

### 접근 제어 헬퍼 (`lib/auth/admin.ts`)

```typescript
async function assertSuperAdmin(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== "superadmin") {
    throw new Error("접근 권한이 없습니다")
  }
}
```

---

## 9. 접근 제어 구현

### 서버 레이아웃 가드

`(dashboard)/settings/layout.tsx`:
```typescript
export default async function SettingsLayout({ children }) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "superadmin") {
    redirect("/dashboard")
  }
  return <SettingsSidebar>{children}</SettingsSidebar>
}
```

### 네비게이션 필터링

클라이언트에서 `currentUser.role`이 `"superadmin"`일 때만 설정 메뉴 표시.

---

## 10. 네비게이션 업데이트

**nav.ts 설정 그룹:**
```typescript
{
  title: "설정",
  items: [
    { title: "회원 관리", href: "/dashboard/settings/members", icon: Users },
    { title: "환경 설정", href: "/dashboard/settings/environment", icon: Settings },
    { title: "권한 관리", href: "/dashboard/settings/permissions", icon: Shield },
  ]
}
```

---

## 11. 마이그레이션

### 순서

1. `SystemConfig` 모델 추가
2. `User.role` 기본값 확인 (이미 `"member"`)
3. 초기 설정 데이터 seed (선택)

### 비파괴

모든 변경은 비파괴 마이그레이션이다.

---

## 12. 구현 순서

1. **데이터베이스**: SystemConfig 모델 + 마이그레이션
2. **인증 로직**: 첫 가입 시 superadmin 부여
3. **서버 액션**: members-actions, config-actions
4. **페이지**: settings/(members|environment|permissions)/page.tsx
5. **네비게이션**: nav.ts 업데이트
6. **접근 제어**: settings layout 가드
7. **테스트**: 인증 E2E (superadmin 접근 확인)

---

## 13. 컴포넌트 구조

### 회원 관리

```
MembersView
├── CardHeader (제목 + "새 회원" 버튼)
├── Filters (Agency, Role, Search)
├── MembersTable
│   ├── Checkbox (전체선택)
│   ├── Name (이름 + 이메일)
│   ├── Agency (소속)
│   ├── Role (배지)
│   ├── CreatedAt (날짜)
│   └── Actions (수정/삭제 드롭다운)
└── Pagination
```

### 환경 설정

```
EnvironmentView
├── Card (사이트 기본 정보)
│   ├── Field: 사이트명
│   ├── Field: 연락처 이메일
│   └── Field: 연락처 전화
└── Card (API 키)
    ├── Field: Kakao 지도 API 키
    ├── Field: VWorld API 키
    └── Field: 공공데이터 API 키
```

### 권한 관리

```
PermissionsView
└── EmptyState (준비 중입니다 메시지)
```

---

## 14. 템플릿 재사용

- **프리미티브**: `components/ui/` (Card, Field, Input, Button, Select, etc.)
- **데이터 표**: 기존 `property-list` 패턴 재사용
- **폼**: 기존 `property-form` 패턴 재사용
- **빈 상태**: `EmptyIllustration` 재사용
