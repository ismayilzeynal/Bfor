"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ROLE_GROUPS, ROLE_LABELS, ROLE_DEFAULT_ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { useCurrentUser, useAllUsers } from "@/hooks/use-role";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import type { Role, User } from "@/types";
import { useState } from "react";

const GROUP_LABELS = {
  leadership: "Leadership",
  management: "Management",
  store_operations: "Store Operations",
};

export function RoleSwitcher() {
  const router = useRouter();
  const user = useCurrentUser();
  const allUsers = useAllUsers();
  const switchRole = useAuthStore((s) => s.switchRole);
  const open = useUiStore((s) => s.roleSwitcherOpen);
  const setOpen = useUiStore((s) => s.setRoleSwitcherOpen);
  const [query, setQuery] = useState("");

  useKeyboardShortcut({ key: "r", meta: true, shift: true }, () => setOpen(!open));

  const grouped = useMemo(() => {
    const byRole = new Map<Role, User[]>();
    for (const u of allUsers) {
      if (!byRole.has(u.role)) byRole.set(u.role, []);
      byRole.get(u.role)!.push(u);
    }
    const q = query.trim().toLowerCase();
    const filterUser = (u: User) =>
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      ROLE_LABELS[u.role].toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q);

    return (Object.keys(ROLE_GROUPS) as (keyof typeof ROLE_GROUPS)[]).map((group) => {
      const roles = ROLE_GROUPS[group];
      const items: User[] = [];
      for (const role of roles) {
        for (const u of byRole.get(role) ?? []) {
          if (filterUser(u)) items.push(u);
        }
      }
      return { group, items };
    });
  }, [allUsers, query]);

  const handleSelect = (u: User) => {
    const next = switchRole(u.id);
    if (!next) return;
    setOpen(false);
    setQuery("");
    toast.success(`Switched to ${ROLE_LABELS[next.role]}`, { description: next.full_name });
    router.push(ROLE_DEFAULT_ROUTES[next.role]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-onboard="role-switcher"
          className="h-9 gap-2 rounded-full border-primary/30 bg-primary/5 px-2 pr-3 hover:bg-primary/10"
        >
          <Avatar className="h-6 w-6">
            {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.full_name} /> : null}
            <AvatarFallback className="text-[10px]">{user.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="flex flex-col text-left leading-tight">
            <span className="max-w-[100px] truncate text-xs font-medium">{user.full_name}</span>
            <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="border-b p-3">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-sm font-medium">Switch role</div>
            <span className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘⇧R
            </span>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Instantly view the app as another role. No login required.
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles or names..."
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[420px]">
          <div className="p-2">
            {grouped.map(({ group, items }) =>
              items.length === 0 ? null : (
                <div key={group} className="mb-2 last:mb-0">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {GROUP_LABELS[group]}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((u) => {
                      const active = u.id === user.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleSelect(u)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-accent",
                            active && "bg-accent"
                          )}
                        >
                          <Avatar className="h-9 w-9">
                            {u.avatar_url ? (
                              <AvatarImage src={u.avatar_url} alt={u.full_name} />
                            ) : null}
                            <AvatarFallback>{u.full_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium">{u.full_name}</span>
                              {active && <Check className="h-3.5 w-3.5 text-primary" />}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                                {ROLE_LABELS[u.role]}
                              </Badge>
                              <span className="truncate text-[10px] text-muted-foreground">
                                → {ROLE_DEFAULT_ROUTES[u.role]}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
            {grouped.every((g) => g.items.length === 0) && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No matches.
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
