"use client";

import { Menu, Search, Command as CommandIcon, LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ROLE_LABELS } from "@/lib/constants";
import { useUiStore } from "@/store/ui-store";
import { useCurrentUser } from "@/hooks/use-role";
import { Breadcrumbs } from "./breadcrumbs";
import { RoleSwitcher } from "./role-switcher";
import { NotificationsPopover } from "./notifications-popover";
import { ThemeToggle } from "./theme-toggle";
import { DemoBadge } from "./brand";
import { Sidebar } from "./sidebar";
import { DateRangePill } from "./date-range-pill";

export function Topbar() {
  const router = useRouter();
  const user = useCurrentUser();
  const setCommandOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const mobileOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar variant="mobile" onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden items-center gap-2 md:flex">
        <DemoBadge />
        <Breadcrumbs />
      </div>
      <div className="flex flex-1 items-center gap-2 md:hidden">
        <DemoBadge />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandOpen(true)}
          className="hidden h-9 w-[220px] justify-between gap-2 text-muted-foreground md:inline-flex"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search...</span>
          </span>
          <span className="flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            <CommandIcon className="h-2.5 w-2.5" />K
          </span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCommandOpen(true)}
          className="md:hidden"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>

        <DateRangePill />
        <NotificationsPopover />
        <ThemeToggle />
        <RoleSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account">
              <Avatar className="h-8 w-8">
                {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.full_name} /> : null}
                <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.full_name}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserIcon className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <SettingsIcon className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <LogOut className="mr-2 h-4 w-4" /> Sign out (demo only)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
