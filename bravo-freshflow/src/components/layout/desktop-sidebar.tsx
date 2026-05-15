"use client";

import { Sidebar } from "./sidebar";

export function DesktopSidebar() {
  return (
    <div className="hidden md:block">
      <Sidebar />
    </div>
  );
}
