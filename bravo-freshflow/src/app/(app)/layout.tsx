import type { ReactNode } from "react";
import { AppHydrator } from "@/components/layout/app-hydrator";
import { CommandPalette } from "@/components/layout/command-palette";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { RouteGuard } from "@/components/layout/route-guard";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppHydrator />
      <RouteGuard />
      <CommandPalette />
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-screen-2xl space-y-6 p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
