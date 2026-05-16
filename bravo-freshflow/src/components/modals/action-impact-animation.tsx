"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { CheckCircle2, ShieldCheck, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAZN } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ActionImpactAnimationProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  potentialLossBefore: number;
  recoveredValueAfter: number;
  riskBefore: number;
  riskAfter: number;
}

export function ActionImpactAnimation({
  open,
  onClose,
  productName,
  potentialLossBefore,
  recoveredValueAfter,
  riskBefore,
  riskAfter,
}: ActionImpactAnimationProps) {
  const [phase, setPhase] = useState<"intro" | "metrics" | "done">("intro");

  useEffect(() => {
    if (!open) {
      setPhase("intro");
      return;
    }
    const t1 = window.setTimeout(() => setPhase("metrics"), 350);
    const t2 = window.setTimeout(() => setPhase("done"), 1900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-emerald-50 via-background to-sky-50 dark:from-emerald-950/40 dark:to-sky-950/40">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full p-1 text-muted-foreground hover:bg-muted/60"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>

          {/* Confetti dots */}
          <AnimatePresence>
            {phase === "done" ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[200px] overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.span
                    key={i}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 200, opacity: [0, 1, 0], rotate: Math.random() * 360 }}
                    transition={{ duration: 1.6, delay: Math.random() * 0.6 }}
                    className="absolute size-2 rounded-sm"
                    style={{
                      left: `${5 + Math.random() * 90}%`,
                      backgroundColor:
                        i % 3 === 0 ? "#10b981" : i % 3 === 1 ? "#f59e0b" : "#3b82f6",
                    }}
                  />
                ))}
              </div>
            ) : null}
          </AnimatePresence>

          <div className="relative space-y-4 p-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Rescue plan activated
                </h3>
                <p className="text-xs text-muted-foreground">{productName}</p>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              {/* Potential loss → goes down */}
              <ImpactMetric
                icon={TrendingDown}
                label="Potential loss"
                from={potentialLossBefore}
                to={0}
                color="rose"
                isCurrency
                delay={0.4}
              />
              {/* Recovered → counts up */}
              <ImpactMetric
                icon={TrendingUp}
                label="Recovered value"
                from={0}
                to={recoveredValueAfter}
                color="emerald"
                isCurrency
                delay={0.6}
              />
            </div>

            <div className="space-y-2 rounded-md border bg-background/80 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Waste risk</span>
                <RiskCountdown from={riskBefore} to={riskAfter} delay={0.9} />
              </div>
              <RiskBarTransition from={riskBefore} to={riskAfter} />
            </div>

            <AnimatePresence>
              {phase === "done" ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-50/80 p-2.5 dark:bg-emerald-950/40"
                >
                  <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                      Task created successfully
                    </p>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                      Assigned to the operations team — track it on the Tasks page.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 bg-background text-[10px] text-emerald-700 dark:text-emerald-300"
                  >
                    <ShieldCheck className="mr-1 size-2.5" aria-hidden />
                    Active
                  </Badge>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImpactMetric({
  icon: Icon,
  label,
  from,
  to,
  color,
  isCurrency,
  delay = 0,
}: {
  icon: typeof CheckCircle2;
  label: string;
  from: number;
  to: number;
  color: "rose" | "emerald";
  isCurrency?: boolean;
  delay?: number;
}) {
  const tone =
    color === "rose"
      ? "text-rose-700 dark:text-rose-300 bg-rose-50/60 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40"
      : "text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn("space-y-1 rounded-md border p-3", tone)}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
        <Icon className="size-3" aria-hidden />
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">
        <CountUpNumber from={from} to={to} duration={1.1} isCurrency={isCurrency} />
      </div>
    </motion.div>
  );
}

function CountUpNumber({
  from,
  to,
  duration = 1,
  isCurrency,
}: {
  from: number;
  to: number;
  duration?: number;
  isCurrency?: boolean;
}) {
  const motionValue = useMotionValue(from);
  const spring = useSpring(motionValue, { stiffness: 60, damping: 18 });
  const display = useTransform(spring, (v) =>
    isCurrency ? formatAZN(v, { compact: false }) : v.toFixed(0)
  );

  useEffect(() => {
    motionValue.set(to);
    return () => {
      motionValue.set(from);
    };
  }, [motionValue, to, from]);

  void duration;
  return <motion.span>{display}</motion.span>;
}

function RiskCountdown({ from, to, delay = 0 }: { from: number; to: number; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums"
    >
      <span className="text-rose-600 line-through opacity-70">{from.toFixed(0)}%</span>
      <span className="text-muted-foreground">→</span>
      <span className="text-emerald-700 dark:text-emerald-300">
        <CountUpNumber from={from} to={to} duration={1.2} />
        %
      </span>
    </motion.span>
  );
}

function RiskBarTransition({ from, to }: { from: number; to: number }) {
  const [val, setVal] = useState(from);
  useEffect(() => {
    const t = window.setTimeout(() => setVal(to), 250);
    return () => window.clearTimeout(t);
  }, [to]);
  const color =
    val >= 80
      ? "[&>div]:bg-rose-500"
      : val >= 60
        ? "[&>div]:bg-orange-500"
        : val >= 40
          ? "[&>div]:bg-amber-500"
          : "[&>div]:bg-emerald-500";
  return <Progress value={val} className={cn("h-2 transition-colors duration-700", color)} />;
}
