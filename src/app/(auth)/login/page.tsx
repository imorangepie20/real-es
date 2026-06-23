"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { loginAction, type AuthState } from "../actions"
import { AuthCard } from "@/components/auth/auth-card"
import { SocialButtons } from "@/components/auth/social-buttons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const initialState: AuthState = { error: null }

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <AuthCard
      title="Welcome back"
      footer={
        <span className="text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-foreground underline-offset-4 hover:underline font-medium">
            Sign up
          </Link>
        </span>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="m@example.com" autoComplete="email" />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full mt-1">
          {pending ? "처리 중..." : "Sign in"}
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
