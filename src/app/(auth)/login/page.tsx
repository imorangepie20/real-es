"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { loginAction, type AuthState } from "../actions"
import { AuthCard } from "@/components/auth/auth-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: AuthState = { error: null }

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <AuthCard
      title="로그인"
      footer={
        <span className="text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/register" className="text-foreground underline-offset-4 hover:underline font-medium">
            회원가입
          </Link>
        </span>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        {/* 이메일 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input id="email" name="email" type="email" placeholder="m@example.com" autoComplete="email" required />
        </div>

        {/* 비밀번호 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">비밀번호</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              비밀번호 찾기
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-9"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full mt-1">
          {pending ? "처리 중..." : "로그인"}
        </Button>
      </form>
    </AuthCard>
  )
}
