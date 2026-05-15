"use client";

import { cn } from "@/lib/utils";

interface Props {
  completed: number;
  total: number;
  size?: number;
  stroke?: number;
  className?: string;
}

export function ProgressRing({ completed, total, size = 64, stroke = 6, className }: Props) {
  const safeTotal = Math.max(total, 1);
  const pct = Math.min(100, Math.round((completed / safeTotal) * 100));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn(
            "transition-[stroke-dashoffset] duration-700",
            pct === 100 ? "stroke-emerald-500" : "stroke-primary"
          )}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold tabular-nums">{pct}%</span>
        <span className="text-[9px] text-muted-foreground tabular-nums">
          {completed}/{total}
        </span>
      </div>
    </div>
  );
}
