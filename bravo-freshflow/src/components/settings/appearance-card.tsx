"use client";

import { Moon, Sun, Monitor, Rows3, Rows4 } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUiStore } from "@/store/ui-store";

export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const density = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);

  return (
    <Card id="appearance">
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Theme and content density across all dashboards.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme</div>
          <ToggleGroup
            type="single"
            value={theme ?? "system"}
            onValueChange={(v) => v && setTheme(v)}
            className="justify-start"
          >
            <ToggleGroupItem value="light" className="gap-1.5">
              <Sun className="h-3.5 w-3.5" /> Light
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" className="gap-1.5">
              <Moon className="h-3.5 w-3.5" /> Dark
            </ToggleGroupItem>
            <ToggleGroupItem value="system" className="gap-1.5">
              <Monitor className="h-3.5 w-3.5" /> System
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Density</div>
          <ToggleGroup
            type="single"
            value={density}
            onValueChange={(v) => v && setDensity(v as "comfortable" | "compact")}
            className="justify-start"
          >
            <ToggleGroupItem value="comfortable" className="gap-1.5">
              <Rows3 className="h-3.5 w-3.5" /> Comfortable
            </ToggleGroupItem>
            <ToggleGroupItem value="compact" className="gap-1.5">
              <Rows4 className="h-3.5 w-3.5" /> Compact
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-[11px] text-muted-foreground">
            Compact tightens table padding and card spacing — applied on the next page load.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
