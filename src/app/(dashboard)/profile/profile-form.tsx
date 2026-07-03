"use client";

import { useState, type ReactNode } from "react";
import { Save, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTel } from "@/lib/properties/format";
import { updateProfile, changePassword } from "@/app/(auth)/actions";

export function ProfileForm({
  user,
}: {
  user: { name: string | null; phone: string | null; email: string };
}) {
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  async function saveProfile() {
    if (!name.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await updateProfile({ name, phone });
      if (res.error) toast.error(res.error);
      else toast.success("프로필을 저장했습니다");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePw() {
    if (!current) {
      toast.error("현재 비밀번호를 입력하세요");
      return;
    }
    if (next.length < 8) {
      toast.error("새 비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (next !== confirm) {
      toast.error("새 비밀번호가 일치하지 않습니다");
      return;
    }
    setSavingPw(true);
    try {
      const res = await changePassword({ currentPassword: current, newPassword: next });
      if (res.error) toast.error(res.error);
      else {
        toast.success("비밀번호를 변경했습니다");
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "변경에 실패했습니다");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">내 프로필</h1>
        <p className="text-sm text-muted-foreground">본인 정보와 비밀번호를 관리합니다.</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>프로필 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Field label="이메일">
            <Input value={user.email} readOnly disabled />
          </Field>
          <Field label="이름" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
          </Field>
          <Field label="전화번호">
            <Input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatTel(e.target.value))}
              placeholder="010-0000-0000"
            />
          </Field>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button onClick={saveProfile} disabled={savingProfile}>
            <Save className="size-3.5" />
            {savingProfile ? "저장 중" : "저장"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Field label="현재 비밀번호" required>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field label="새 비밀번호" required>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="8자 이상" autoComplete="new-password" />
          </Field>
          <Field label="새 비밀번호 확인" required>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </Field>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button onClick={changePw} disabled={savingPw}>
            <KeyRound className="size-3.5" />
            {savingPw ? "변경 중" : "비밀번호 변경"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
