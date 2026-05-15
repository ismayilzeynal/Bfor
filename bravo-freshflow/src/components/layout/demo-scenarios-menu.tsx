"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DEMO_SCENARIOS } from "@/lib/demo-scenarios";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";

export function DemoScenariosMenu() {
  const router = useRouter();
  const switchRole = useAuthStore((s) => s.switchRole);
  const demoMode = useUiStore((s) => s.demoMode);
  const [playing, setPlaying] = useState<string | null>(null);

  if (!demoMode) return null;

  const play = (id: string) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === id);
    if (!scenario) return;
    setPlaying(id);
    setTimeout(() => {
      if (scenario.roleId) switchRole(scenario.roleId);
      router.push(scenario.route);
      setPlaying(null);
      toast.success(`Playing: ${scenario.label}`);
    }, 350);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden h-9 gap-1.5 px-2 text-xs lg:inline-flex"
          aria-label="Demo scenarios"
        >
          <Clapperboard className="h-3.5 w-3.5 text-amber-600" />
          <span>Scenarios</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
          <Clapperboard className="h-3.5 w-3.5 text-amber-600" />
          Demo Scenarios
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DEMO_SCENARIOS.map((s) => {
          const isPlaying = playing === s.id;
          return (
            <DropdownMenuItem
              key={s.id}
              className="flex items-start gap-2 py-2"
              onSelect={(e) => {
                e.preventDefault();
                play(s.id);
              }}
              disabled={isPlaying}
            >
              <span className="mt-0.5 text-base leading-none">{s.emoji}</span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs font-medium">{s.label}</span>
                <span className="line-clamp-2 text-[10px] text-muted-foreground">{s.description}</span>
              </div>
              {isPlaying ? <Loader2 className="ml-1 h-3.5 w-3.5 shrink-0 animate-spin" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
