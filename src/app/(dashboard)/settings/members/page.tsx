"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal, Search, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyIllustration } from "@/components/empty-illustration";
import {
  listMembers,
  type MemberRow,
  deleteMember,
} from "@/lib/members/members-actions";
import { formatTel } from "@/lib/properties/format";
import { toast } from "sonner";

// ─── Badge styles ─────────────────────────────────────────────────────────────

const roleClass: Record<string, string> = {
  superadmin: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  member: "bg-secondary text-secondary-foreground",
};

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: ColumnDef<MemberRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={
          table.getIsSomePageRowsSelected() &&
          !table.getIsAllPageRowsSelected()
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    size: 40,
  },
  {
    id: "user",
    accessorFn: (row) => `${row.name || ""} ${row.email}`,
    header: "사용자",
    cell: ({ row }) => {
      const u = row.original;
      const initials = u.name
        ? u.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : u.email[0].toUpperCase();

      return (
        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="grid leading-tight">
            <span className="font-medium">{u.name || "미입력"}</span>
            <span className="text-xs text-muted-foreground">{u.email}</span>
          </div>
        </div>
      );
    },
    filterFn: (row, _id, filterValue: string) => {
      const v = filterValue.toLowerCase();
      return (
        (row.original.name || "").toLowerCase().includes(v) ||
        row.original.email.toLowerCase().includes(v)
      );
    },
  },
  {
    accessorKey: "agencyName",
    header: "소속",
    cell: ({ row }) => {
      const agencyName = row.getValue("agencyName") as string;
      return <span className="text-sm">{agencyName}</span>;
    },
  },
  {
    accessorKey: "phone",
    header: "연락처",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string | null;
      return <span className="text-sm text-muted-foreground">{phone ? formatTel(phone) : "-"}</span>;
    },
  },
  {
    accessorKey: "role",
    header: "역할",
    cell: ({ row }) => {
      const role = row.getValue<string>("role");
      const label = role === "superadmin" ? "슈퍼어드민" : "사용자";
      return (
        <Badge className={cn("border-transparent", roleClass[role] || roleClass.member)}>
          {label}
        </Badge>
      );
    },
    filterFn: (row, _id, filterValue: string) =>
      filterValue === "all" || row.original.role === filterValue,
  },
  {
    accessorKey: "createdAt",
    header: "가입일",
    cell: ({ row }) => {
      const date = row.getValue<Date>("createdAt");
      return (
        <span className="text-sm text-muted-foreground">
          {new Date(date).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).replace(/\./g, ".")}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const u = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="작업 메뉴">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{u.name || "미입력"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = `/dashboard/settings/members/${u.id}`}>
              수정
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => handleDelete(u.id, u.email || "")}
            >
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    size: 48,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function handleDelete(id: string, email: string) {
  if (!confirm(`정말 ${email} 계정을 삭제하시겠습니까?`)) return;

  const result = await deleteMember(id);
  if (result.error) {
    toast.error(result.error);
  } else {
    toast.success("계정이 삭제되었습니다.");
    window.location.reload();
  }
}

// ─── Root ───────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // 데이터 로드
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await listMembers();
        setMembers(data);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "회원 목록을 불러오는데 실패했습니다.";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredData = useMemo(() => {
    const q = globalFilter.toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        (m.name || "").toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [globalFilter, roleFilter, members]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">회원 관리</h1>
          <p className="text-sm text-muted-foreground">
            사용자 계정을 관리하고 역할을 설정합니다.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/settings/members/new")}>
          <Plus className="size-4" />
          회원 추가
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름 또는 이메일 검색…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "superadmin", "member"] as const).map((r) => (
            <Button
              key={r}
              variant={roleFilter === r ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleFilter(r)}
            >
              {r === "all" ? "전체" : r === "superadmin" ? "슈퍼어드민" : "사용자"}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <EmptyIllustration className="size-16 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mt-4">
            {globalFilter || roleFilter !== "all" ? "검색 결과가 없습니다." : "회원이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} style={{ width: h.column.columnDef.size }}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    결과가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {table.getFilteredSelectedRowModel().rows.length} /{" "}
          {filteredData.length}개 선택됨
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs">
            페이지 {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            이전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            다음
          </Button>
        </div>
      </div>
    </>
  );
}
