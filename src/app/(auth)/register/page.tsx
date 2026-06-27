"use client"

import { useActionState } from "react"
import Link from "next/link"

import { signupAction, type AuthState } from "../actions"
import { AuthCard } from "@/components/auth/auth-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: AuthState = { error: null }

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(signupAction, initialState)

  return (
    <AuthCard
      title="회원가입"
      footer={
        <span className="text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline font-medium">
            로그인
          </Link>
        </span>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        {/* 상호명 (Agency) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agencyName">상호명</Label>
          <Input id="agencyName" name="agencyName" type="text" placeholder="○○공인중개사" autoComplete="organization" required />
        </div>

        {/* 중개사무소 주소 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agencyAddress">중개사무소 주소</Label>
          <Input id="agencyAddress" name="agencyAddress" type="text" placeholder="예: 성남시 분당구 정자일로 95" autoComplete="street-address" />
        </div>

        {/* 중개사무소 전화번호 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agencyPhone">중개사무소 전화번호</Label>
          <Input id="agencyPhone" name="agencyPhone" type="tel" inputMode="tel" placeholder="031-000-0000" autoComplete="tel" />
        </div>

        {/* 이름 (필수) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">이름</Label>
          <Input id="name" name="name" type="text" placeholder="홍길동" autoComplete="name" required />
        </div>

        {/* 개인 전화번호 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">개인 전화번호</Label>
          <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="010-0000-0000" autoComplete="tel" />
        </div>

        {/* 이메일 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input id="email" name="email" type="email" placeholder="m@example.com" autoComplete="email" required />
        </div>

        {/* 비밀번호 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full mt-1">
          {pending ? "처리 중..." : "가입하기"}
        </Button>
      </form>
    </AuthCard>
  )
}
