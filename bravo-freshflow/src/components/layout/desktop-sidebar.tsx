"use client";

import { Sidebar } from "./sidebar";

export function DesktopSidebar() {
  return (
    <div
      className="sticky top-0 hidden h-screen self-start md:block"
      data-onboard="sidebar"
    >
      <Sidebar />
    </div>
  );
}
