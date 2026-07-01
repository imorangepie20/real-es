"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { navGroups } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.role);
        }
      } catch {
        // 실패 시 silent 처리
      }
    }
    fetchUserRole();
  }, []);

  // 설정 메뉴는 superadmin만 표시
  const filteredNavGroups = navGroups.map((group) => {
    if (group.label === "설정") {
      if (userRole !== "superadmin") {
        return null; // 설정 그룹 숨김
      }
    }
    return group;
  }).filter((g): g is Exclude<typeof g, null> => g !== null);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-muted-foreground sm:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="ml-2">Search…</span>
        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium sm:flex">
          ⌘K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Command Palette</DialogTitle>
            <DialogDescription>Search for a page to navigate to.</DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="페이지 이름 검색…" />
            <CommandList>
              <CommandEmpty>결과가 없습니다.</CommandEmpty>
              {filteredNavGroups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.title}
                      value={`${group.label} ${item.title}`}
                      onSelect={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}
                    >
                      {item.icon && <item.icon className="size-4" />}
                      <span>{item.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
