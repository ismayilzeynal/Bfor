"use client";

import { useEffect, useState } from "react";
import {
  User as UserIcon,
  Bell,
  Palette,
  Globe,
  Database,
  Sparkles,
  Shield,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { cn } from "@/lib/utils";
import { ProfileCard } from "./profile-card";
import { NotificationPrefsCard } from "./notification-prefs-card";
import { AppearanceCard } from "./appearance-card";
import { LocalizationCard } from "./localization-card";
import { DataPrefsCard } from "./data-prefs-card";
import { DemoControlsCard } from "./demo-controls-card";
import { SecurityCard } from "./security-card";
import { AboutCard } from "./about-card";

const SECTIONS = [
  { id: "profile", label: "Profile", Icon: UserIcon },
  { id: "notification-preferences", label: "Notifications", Icon: Bell },
  { id: "appearance", label: "Appearance", Icon: Palette },
  { id: "localization", label: "Localization", Icon: Globe },
  { id: "data-preferences", label: "Data", Icon: Database },
  { id: "demo-controls", label: "Demo Controls", Icon: Sparkles },
  { id: "security", label: "Security", Icon: Shield },
  { id: "about", label: "About", Icon: Info },
];

export function SettingsShell() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = window.location.hash.replace("#", "");
    if (initial && SECTIONS.some((s) => s.id === initial)) {
      setActive(initial);
      document.getElementById(initial)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleNav = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Profile, preferences, demo controls." />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="sticky top-20 hidden h-fit space-y-0.5 lg:block">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleNav(s.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                active === s.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <s.Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          <ProfileCard />
          <NotificationPrefsCard />
          <AppearanceCard />
          <LocalizationCard />
          <DataPrefsCard />
          <DemoControlsCard />
          <SecurityCard />
          <AboutCard />
        </div>
      </div>
    </div>
  );
}
