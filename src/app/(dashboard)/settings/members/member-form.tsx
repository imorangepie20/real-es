"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, KeyRound } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { formatTel } from "@/lib/properties/format"
import {
  createMember, updateMember, resetMemberPassword, type MemberRow,
} from "@/lib/members/members-actions"

const ROLES = [
  { value: "member", label: "사용자" },
  { value: "superadmin", label: "슈퍼어드민" },
] as const

export function MemberForm({
  member, agencies, isSelf,
}: {
  member?: MemberRow
  agencies: { id: string; name: string }[]
  isSelf?: boolean
}) {
  const router = useRouter()
  const editing = !!member

  const [agencyId, setAgencyId] = useState(member?.agencyId ?? agencies[0]?.id ?? "")
  const [email, setEmail] = useState(member?.email ?? "")
  const [password, setPassword] = useState("")
  const [name, setName] = useState(member?.name ?? "")
  const [phone, setPhone] = useState(member?.phone ?? "")
  const [role, setRole] = useState<string>(member?.role ?? "member")
  const [saving, setSaving] = useState(false)

  // 비밀번호 초기화 다이얼로그
  const [pwOpen, setPwOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [resetting, setResetting] = useState(false)

  async function save() {
    if (editing) {
      if (!name.trim()) { toast.error("이름을 입력하세요"); return }
      setSaving(true)
      try {
        const res = await updateMember(member!.id, { name, phone, role: role as "member" | "superadmin" })
        if (res.error) toast.error(res.error)
        else { toast.success("수정했습니다"); router.push("/settings/members"); router.refresh() }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "저장에 실패했습니다")
      } finally { setSaving(false) }
    } else {
      if (!agencyId) { toast.error("소속을 선택하세요"); return }
      if (!email.trim()) { toast.error("이메일을 입력하세요"); return }
      if (password.length < 8) { toast.error("비밀번호는 8자 이상이어야 합니다"); return }
      if (!name.trim()) { toast.error("이름을 입력하세요"); return }
      setSaving(true)
      try {
        const res = await createMember({ agencyId, email, password, name, phone, role: role as "member" | "superadmin" })
        if (res.error) toast.error(res.error)
        else { toast.success("등록했습니다"); router.push("/settings/members"); router.refresh() }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "저장에 실패했습니다")
      } finally { setSaving(false) }
    }
  }

  async function resetPassword() {
    if (newPassword.length < 8) { toast.error("비밀번호는 8자 이상이어야 합니다"); return }
    setResetting(true)
    try {
      const res = await resetMemberPassword(member!.id, newPassword)
      if (res.error) toast.error(res.error)
      else { toast.success("비밀번호를 초기화했습니다"); setPwOpen(false); setNewPassword("") }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "초기화에 실패했습니다")
    } finally { setResetting(false) }
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>{editing ? "회원 수정" : "새 회원"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="소속" required={!editing}>
              {editing ? (
                <Input value={member!.agencyName} readOnly />
              ) : (
                <NativeSelect className="w-full" value={agencyId} onChange={(e) => setAgencyId(e.target.value)}>
                  <NativeSelectOption value="">선택</NativeSelectOption>
                  {agencies.map((a) => <NativeSelectOption key={a.id} value={a.id}>{a.name}</NativeSelectOption>)}
                </NativeSelect>
              )}
            </Field>
            <Field label="역할">
              <RadioGroup value={role} onValueChange={(v) => { if (v != null && !isSelf) setRole(v) }} className="flex h-9 flex-row items-center gap-4">
                {ROLES.map((r) => (
                  <div key={r.value} className="flex items-center gap-1.5">
                    <RadioGroupItem value={r.value} id={`role-${r.value}`} disabled={isSelf} />
                    <Label htmlFor={`role-${r.value}`} className={cn("font-normal", isSelf && "cursor-not-allowed opacity-60")}>{r.label}</Label>
                  </div>
                ))}
              </RadioGroup>
              {isSelf && <p className="text-xs text-muted-foreground">본인 역할은 변경할 수 없습니다.</p>}
            </Field>
            <Field label="이름" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
            </Field>
            <Field label="전화번호">
              <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatTel(e.target.value))} placeholder="010-0000-0000" />
            </Field>
            <Field label="이메일" required={!editing}>
              {editing ? (
                <Input value={member!.email} readOnly />
              ) : (
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              )}
            </Field>
            {!editing && (
              <Field label="비밀번호" required>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" />
              </Field>
            )}
          </div>

          {editing && (
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-3">
              <div>
                <p className="text-sm font-medium">비밀번호 초기화</p>
                <p className="text-xs text-muted-foreground">새 비밀번호를 입력해 초기화합니다.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
                <KeyRound className="size-3.5" />초기화
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button variant="outline" onClick={() => router.push("/settings/members")}>
            <ArrowLeft className="size-3.5" />취소
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="size-3.5" />{saving ? "저장 중" : "저장"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 초기화</DialogTitle>
            <DialogDescription>{member?.email} 계정의 새 비밀번호를 입력하세요 (8자 이상).</DialogDescription>
          </DialogHeader>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="새 비밀번호" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>취소</Button>
            <Button onClick={resetPassword} disabled={resetting}>{resetting ? "처리 중" : "초기화"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  )
}
