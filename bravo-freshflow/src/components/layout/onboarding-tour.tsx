"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Sparkles, ArrowRight, X, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useUiStore } from "@/store/ui-store";
import { usePlatformKeys } from "@/hooks/use-platform";

interface TourStep {
  id: string;
  title: string;
  body: string;
  selector: string;
  placement: "right" | "bottom" | "left";
}

function buildSteps(mod: string): TourStep[] {
  return [
    {
      id: "sidebar",
      title: "Navigation sidebar",
      body: "Every screen of the platform lives here, grouped by what each role needs. Switch roles to see how the sidebar adapts.",
      selector: "[data-onboard='sidebar']",
      placement: "right",
    },
    {
      id: "kpi-grid",
      title: "KPI grid",
      body: "Top-of-page KPIs answer the executive question first: how much is at risk today and how much we've already recovered.",
      selector: "[data-onboard='kpi-grid']",
      placement: "bottom",
    },
    {
      id: "notifications",
      title: "Notifications bell",
      body: "Critical risks, approvals waiting on you, and task pings all funnel into one inbox. Filter by priority or mark all read.",
      selector: "[data-onboard='notifications']",
      placement: "bottom",
    },
    {
      id: "role-switcher",
      title: "Role switcher",
      body: "No login — pick any role to instantly see the platform from their seat. The data scopes automatically.",
      selector: "[data-onboard='role-switcher']",
      placement: "bottom",
    },
    {
      id: "command-palette",
      title: `Command palette (${mod}K)`,
      body: "Jump to any page, product, or task without leaving the keyboard. Press ? anywhere to see all shortcuts.",
      selector: "[data-onboard='search']",
      placement: "bottom",
    },
  ];
}

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function useAnchorRect(selector: string, deps: unknown[]): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = typeof document !== "undefined" ? document.querySelector(selector) : null;
      if (!el) {
        setRect(null);
        return;
      }
      const r = (el as HTMLElement).getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const obs = new ResizeObserver(measure);
    if (typeof document !== "undefined" && document.body) obs.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const t = window.setTimeout(measure, 60);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...deps]);

  return rect;
}

function tooltipPosition(rect: AnchorRect, placement: TourStep["placement"]): React.CSSProperties {
  const margin = 14;
  const width = 320;
  switch (placement) {
    case "right":
      return {
        top: Math.max(12, rect.top),
        left: Math.min(window.innerWidth - width - 12, rect.left + rect.width + margin),
        width,
      };
    case "left":
      return {
        top: Math.max(12, rect.top),
        left: Math.max(12, rect.left - width - margin),
        width,
      };
    case "bottom":
    default:
      return {
        top: Math.min(window.innerHeight - 220, rect.top + rect.height + margin),
        left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.left)),
        width,
      };
  }
}

export function OnboardingTour() {
  const seen = useUiStore((s) => s.onboardingSeen);
  const active = useUiStore((s) => s.onboardingActive);
  const setSeen = useUiStore((s) => s.setOnboardingSeen);
  const setActive = useUiStore((s) => s.setOnboardingActive);

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const { mod } = usePlatformKeys();
  const STEPS = useMemo(() => buildSteps(mod), [mod]);

  useEffect(() => {
    if (!seen && !active) {
      const t = window.setTimeout(() => setWelcomeOpen(true), 800);
      return () => window.clearTimeout(t);
    }
  }, [seen, active]);

  const startTour = () => {
    setWelcomeOpen(false);
    setStepIdx(0);
    setDone(false);
    setActive(true);
  };

  const skipTour = () => {
    setWelcomeOpen(false);
    setSeen(true);
    setActive(false);
  };

  const finish = () => {
    setDone(true);
  };

  const closeFinal = () => {
    setDone(false);
    setActive(false);
    setSeen(true);
  };

  const step = STEPS[stepIdx];
  const rect = useAnchorRect(step?.selector ?? "", [active, stepIdx]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setActive(false);
        setSeen(true);
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        setStepIdx((i) => (i < STEPS.length - 1 ? i + 1 : i));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStepIdx((i) => (i > 0 ? i - 1 : 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, setActive, setSeen]);

  return (
    <>
      <Dialog open={welcomeOpen} onOpenChange={(o) => (!o ? skipTour() : setWelcomeOpen(o))}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Welcome to Bfor
            </DialogTitle>
            <DialogDescription>
              Detect, explain, compare, act, and learn — all from one screen. Take a 30-second tour?
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 rounded-md border bg-muted/40 p-3 text-xs">
            <li className="flex items-start gap-2"><span className="text-emerald-600">•</span> 5 quick stops across the UI</li>
            <li className="flex items-start gap-2"><span className="text-emerald-600">•</span> Replayable any time from Settings → About</li>
            <li className="flex items-start gap-2"><span className="text-emerald-600">•</span> Press <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Esc</kbd> to exit, <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">→</kbd> to advance</li>
          </ul>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={skipTour}>Skip for now</Button>
            <Button size="sm" onClick={startTour}>
              Start tour <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {active && step && !done ? (
        <div className="pointer-events-none fixed inset-0 z-[55]">
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" aria-hidden />
          {rect ? (
            <div
              aria-hidden
              className="absolute rounded-lg ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950/40 transition-all"
              style={{
                top: rect.top - 4,
                left: rect.left - 4,
                width: rect.width + 8,
                height: rect.height + 8,
                boxShadow: "0 0 0 9999px rgba(2,6,23,0.45)",
                borderRadius: 12,
              }}
            />
          ) : null}
          {rect ? (
            <div
              role="dialog"
              aria-label={step.title}
              className="pointer-events-auto absolute rounded-lg border bg-card p-4 shadow-2xl"
              style={tooltipPosition(rect, step.placement)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                  Step {stepIdx + 1} of {STEPS.length}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mr-2 -mt-2 h-7 w-7"
                  aria-label="Skip tour"
                  onClick={() => {
                    setActive(false);
                    setSeen(true);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <h3 className="mt-1 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">{step.body}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={
                        i === stepIdx
                          ? "h-1.5 w-4 rounded-full bg-emerald-600"
                          : i < stepIdx
                          ? "h-1.5 w-1.5 rounded-full bg-emerald-300"
                          : "h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700"
                      }
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  {stepIdx > 0 ? (
                    <Button size="sm" variant="ghost" onClick={() => setStepIdx((i) => i - 1)}>
                      Back
                    </Button>
                  ) : null}
                  {stepIdx < STEPS.length - 1 ? (
                    <Button size="sm" onClick={() => setStepIdx((i) => i + 1)}>
                      Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={finish}>
                      Finish
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto absolute left-1/2 top-1/2 w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-2xl">
              <p className="text-xs text-muted-foreground">
                Can't locate the highlighted element on this page. Try the tour from the executive dashboard.
              </p>
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  setActive(false);
                  setSeen(true);
                }}
              >
                Close tour
              </Button>
            </div>
          )}
        </div>
      ) : null}

      <Dialog open={done} onOpenChange={(o) => (!o ? closeFinal() : null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-emerald-600" />
              You're all set
            </DialogTitle>
            <DialogDescription>
              Explore freely — every action is local-only. Replay the tour any time from Settings → About.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" onClick={closeFinal}>Get started 🚀</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
