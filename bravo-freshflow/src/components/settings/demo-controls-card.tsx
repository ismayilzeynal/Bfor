"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, PlayCircle, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUiStore } from "@/store/ui-store";
import { useActionsStore } from "@/store/actions-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { useFiltersStore } from "@/store/filters-store";
import { useWhatIfStore } from "@/store/whatif-store";
import { useAuthStore } from "@/store/auth-store";

interface DemoScenario {
  id: string;
  label: string;
  description: string;
  route: string;
  roleId: string | null;
}

const SCENARIOS: DemoScenario[] = [
  {
    id: "crisis-yogurt",
    label: "Crisis: Qatıq 500q",
    description: "Open Qatıq 500q with all panels pristine — AI Recommendation highlighted, combined scenario pre-selected.",
    route: "/products/p-demo-yogurt#whatif",
    roleId: "u-001",
  },
  {
    id: "morning-approvals",
    label: "Morning approvals queue",
    description: "Pending high-priority recommendations awaiting review for the start of the shift.",
    route: "/recommendations?tab=pending",
    roleId: "u-001",
  },
  {
    id: "employee-shift",
    label: "Employee shift starts",
    description: "Switch to an employee and land on their mobile task list with 3 queued tasks.",
    route: "/my-tasks",
    roleId: "u-010",
  },
  {
    id: "end-of-day",
    label: "End-of-day report",
    description: "CEO view with elevated saved-value KPIs and the day's wins highlighted.",
    route: "/executive",
    roleId: "u-001",
  },
];

export function DemoControlsCard() {
  const router = useRouter();
  const demoMode = useUiStore((s) => s.demoMode);
  const setDemoMode = useUiStore((s) => s.setDemoMode);
  const resetActions = useActionsStore((s) => s.reset);
  const resetNotifications = useNotificationsStore((s) => s.reset);
  const resetWhatif = useWhatIfStore((s) => s.clearSnapshots);
  const filtersClear = useFiltersStore((s) => s.clearAll);
  const resetAuth = useAuthStore((s) => s.reset);
  const switchRole = useAuthStore((s) => s.switchRole);

  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const [resetting, setResetting] = useState(false);
  const [replaying, setReplaying] = useState(false);

  const handleReset = () => {
    setResetting(true);
    setTimeout(() => {
      resetActions();
      resetNotifications();
      resetWhatif();
      filtersClear();
      resetAuth();
      setResetting(false);
      toast.success("Demo data reset — refresh to reload from disk", {
        action: { label: "Refresh", onClick: () => window.location.reload() },
      });
    }, 600);
  };

  const handleReplay = () => {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;
    setReplaying(true);
    setTimeout(() => {
      if (scenario.roleId) switchRole(scenario.roleId);
      router.push(scenario.route);
      setReplaying(false);
      toast.success(`Playing: ${scenario.label}`);
    }, 400);
  };

  const selected = SCENARIOS.find((s) => s.id === scenarioId);

  return (
    <Card id="demo-controls" className="border-amber-200/60 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          Demo Controls
        </CardTitle>
        <CardDescription>For walkthroughs and judging — affects local state only.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-md border bg-card p-3">
          <div>
            <div className="text-sm font-medium">Demo mode</div>
            <p className="text-[11px] text-muted-foreground">
              Shows the pulsing DEMO badge top-right and unlocks debug overlays. On for hackathon judging.
            </p>
          </div>
          <Switch checked={demoMode} onCheckedChange={setDemoMode} aria-label="Demo mode" />
        </div>

        <div className="space-y-2 rounded-md border bg-card p-3">
          <Label className="text-xs">Replay demo scenario</Label>
          <Select value={scenarioId} onValueChange={setScenarioId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIOS.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected ? (
            <p className="text-[11px] text-muted-foreground">{selected.description}</p>
          ) : null}
          <Button size="sm" className="w-full" onClick={handleReplay} disabled={replaying}>
            {replaying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="mr-1.5 h-3.5 w-3.5" />}
            Play scenario
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-rose-200/60 bg-rose-50/50 p-3 dark:border-rose-900/30 dark:bg-rose-950/20">
          <div className="flex items-start gap-2">
            <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
            <div>
              <div className="text-sm font-medium text-rose-900 dark:text-rose-100">Reset demo data</div>
              <p className="text-[11px] text-rose-900/70 dark:text-rose-100/70">
                Clears all local approvals, decisions, task overrides, transfers, discounts, data-issue resolutions, what-if snapshots, filters, and role overrides. Mock JSON files reload from disk on next refresh.
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-full border-rose-300 text-rose-700 hover:bg-rose-100">
                Reset all local state
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all local demo state?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears every approval, decision, task override, transfer status, discount adjustment, data-issue resolution, what-if snapshot, saved view, and profile change you've made in this browser. The page will reload from the original JSON files.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} disabled={resetting}>
                  {resetting ? "Resetting…" : "Reset everything"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
