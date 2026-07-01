"use client";

import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listConfigs,
  updateConfigs,
} from "@/lib/config/config-actions";
import { toast } from "sonner";

// ─── Field Row helper ────────────────────────────────────────────────────────────

function FieldRow({
  label,
  description,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={label}>{label}</Label>
      <Input
        id={label}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

// ─── Site Config ───────────────────────────────────────────────────────────────────

const siteConfigs = [
  { key: "siteName", label: "사이트명", placeholder: "RESM" },
  { key: "contactEmail", label: "연락처 이메일", type: "email" as const, placeholder: "contact@example.com" },
  { key: "contactPhone", label: "연락처 전화", placeholder: "02-1234-5678" },
];

// ─── API Config ───────────────────────────────────────────────────────────────────

const apiConfigs = [
  { key: "kakaoMapKey", label: "Kakao 지도 API 키", type: "password" as const },
  { key: "vworldKey", label: "VWorld API 키", type: "password" as const },
  { key: "publicDataApiKey", label: "공공데이터 API 키", type: "password" as const },
];

// ─── Root ─────────────────────────────────────────────────────────────────────────

export default function EnvironmentPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 설정 로드
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await listConfigs();
        const configMap: Record<string, string> = {};
        data.forEach((c) => {
          configMap[c.key] = c.value;
        });
        setConfigs(configMap);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "설정을 불러오는데 실패했습니다.";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 저장
  async function handleSave() {
    setSaving(true);
    try {
      const updates = Object.entries(configs).map(([key, value]) => ({ key, value }));
      const result = await updateConfigs(updates);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("설정이 저장되었습니다.");
      }
    } catch (_error) {
      toast.error("설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getConfigValue = (key: string) => configs[key] || "";

  return (
    <>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">환경 설정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          사이트 기본 정보와 API 키를 관리합니다.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* 사이트 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>사이트 기본 정보</CardTitle>
            <CardDescription>
              사이트에 표시되는 기본 정보를 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {siteConfigs.map((config) => (
              <FieldRow
                key={config.key}
                label={config.label}
                value={getConfigValue(config.key)}
                onChange={(v) => setConfigs((prev) => ({ ...prev, [config.key]: v }))}
                placeholder={config.placeholder}
                type={config.type}
              />
            ))}
          </CardContent>
        </Card>

        {/* API 키 */}
        <Card>
          <CardHeader>
            <CardTitle>API 키</CardTitle>
            <CardDescription>
              외부 서비스 연동을 위한 API 키를 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {apiConfigs.map((config) => (
              <FieldRow
                key={config.key}
                label={config.label}
                value={getConfigValue(config.key)}
                onChange={(v) => setConfigs((prev) => ({ ...prev, [config.key]: v }))}
                type={config.type}
                description={config.key === "kakaoMapKey" ? "Kakao 지도 JavaScript 키" : undefined}
              />
            ))}
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="size-4" />
                저장하기
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
