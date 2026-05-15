"use client";

import { Sidebar } from "./sidebar";

export function DesktopSidebar() {
  return (
    <div className="hidden md:block" data-onboard="sidebar">
      <Sidebar />
    </div>
  );
}
