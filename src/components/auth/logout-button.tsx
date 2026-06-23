"use client"

import { logoutAction } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size="sm">
        로그아웃
      </Button>
    </form>
  )
}
