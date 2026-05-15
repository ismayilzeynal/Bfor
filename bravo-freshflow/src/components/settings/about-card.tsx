"use client";

import { Sparkles, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TECH = [
  "Next.js 14",
  "TypeScript",
  "Tailwind CSS",
  "shadcn/ui",
  "Zustand",
  "TanStack Table",
  "Recharts",
  "Framer Motion",
  "date-fns",
  "cmdk",
  "Sonner",
];

const TEAM = [
  { name: "Aysel Məmmədova", role: "Product · Demo Lead" },
  { name: "Rəşad Əliyev", role: "Frontend Engineering" },
  { name: "Nigar Hüseynova", role: "Data Modelling" },
  { name: "Elnur İbrahimov", role: "UX Design" },
];

export function AboutCard() {
  return (
    <Card id="about">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          About Bravo FreshFlow AI
        </CardTitle>
        <CardDescription>Hackathon build · designed to prevent loss before it happens.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border bg-card p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Version</div>
            <div className="mt-1 font-mono text-base font-semibold">1.0.0</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Build 2026-05-15 · Hackathon edition</div>
          </div>
          <div className="rounded-md border bg-card p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tagline</div>
            <div className="mt-1 text-sm italic">“Detect. Explain. Compare. Act. Learn.”</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tech stack</div>
          <div className="flex flex-wrap gap-1.5">
            {TECH.map((t) => (
              <Badge key={t} variant="outline" className="font-normal">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Team</div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {TEAM.map((m) => (
              <li key={m.name} className="rounded-md border bg-card px-3 py-2">
                <div className="font-medium">{m.name}</div>
                <div className="text-[10px] text-muted-foreground">{m.role}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <span>Built for the Bravo Retail Hackathon 2026.</span>
          <a
            href="#"
            className="inline-flex items-center gap-1 text-primary hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Release notes <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
