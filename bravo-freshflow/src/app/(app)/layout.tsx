import type { ReactNode } from "react";
import { AppHydrator } from "@/components/layout/app-hydrator";
import { CommandPalette } from "@/components/layout/command-palette";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { OnboardingTour } from "@/components/layout/onboarding-tour";
import { RouteGuard } from "@/components/layout/route-guard";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppHydrator />
      <RouteGuard />
      <CommandPalette />
      <GlobalShortcuts />
      <OnboardingTour />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-emerald-600 focus:px-3 focus:py-1.5 focus:text-xs focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main-content" className="flex-1">
          <div className="mx-auto w-full max-w-screen-2xl space-y-6 p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
