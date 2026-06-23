"use client"

import { useActionState } from "react"
import Link from "next/link"

import { signupAction, type AuthState } from "../actions"
import { AuthCard } from "@/components/auth/auth-card"
import { SocialButtons } from "@/components/auth/social-buttons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const initialState: AuthState = { error: null }

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(signupAction, initialState)

  return (
    <AuthCard
      title="Create an account"
      footer={
        <span className="text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline font-medium">
            Sign in
          </Link>
        </span>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        {/* 상호명 (Agency) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agencyName">상호명</Label>
          <Input id="agencyName" name="agencyName" type="text" placeholder="○○공인중개사" autoComplete="organization" />
        </div>

        {/* 이름 (선택) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">이름 (선택)</Label>
          <Input id="name" name="name" type="text" placeholder="홍길동" autoComplete="name" />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="m@example.com" autoComplete="email" />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" />
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full mt-1">
          {pending ? "처리 중..." : "Create account"}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">Or continue with</span>
          <Separator className="flex-1" />
        </div>

        <SocialButtons />
      </form>
    </AuthCard>
  )
}
