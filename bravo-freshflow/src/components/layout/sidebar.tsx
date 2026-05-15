"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Command } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, ROLE_ALLOWED_ROUTES, ROLE_LABELS } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/use-role";
import { useUiStore } from "@/store/ui-store";
import { Brand } from "./brand";
import { NavIcon } from "./nav-icon";

interface SidebarProps {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const isMobile = variant === "mobile";
  const isCollapsed = !isMobile && collapsed;
  const allowed = ROLE_ALLOWED_ROUTES[user.role] ?? [];

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-card transition-[width] duration-200",
        isMobile ? "w-72" : isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn("flex h-14 items-center border-b px-3", isCollapsed && "justify-center px-2")}>
        <Brand variant={isCollapsed ? "icon" : "full"} />
      </div>

      <ScrollArea className="flex-1">
        <nav className={cn("space-y-5 p-3", isCollapsed && "px-2")}>
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((i) => allowed.includes(i.href));
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                {!isCollapsed ? (
                  <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </div>
                ) : (
                  <div className="mb-1 mt-1 h-px bg-border" />
                )}
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href + "/"));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          title={isCollapsed ? item.label : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/80 hover:bg-accent hover:text-foreground",
                            isCollapsed && "justify-center px-2"
                          )}
                        >
                          <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <div className={cn("border-t p-3", isCollapsed && "px-2")}>
        <div className={cn("flex items-center gap-2 rounded-md p-1.5", isCollapsed && "justify-center")}>
          <Avatar className="h-8 w-8">
            {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.full_name} /> : null}
            <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{user.full_name}</div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>{ROLE_LABELS[user.role]}</span>
                <span className="ml-auto flex items-center gap-0.5 rounded border px-1 py-px font-mono">
                  <Command className="h-2.5 w-2.5" />K
                </span>
              </div>
            </div>
          )}
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className={cn("mt-2 w-full justify-center text-xs text-muted-foreground", isCollapsed && "px-0")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="mr-1 h-4 w-4" /> Collapse
              </>
            )}
          </Button>
        )}
      </div>
    </aside>
  );
}
