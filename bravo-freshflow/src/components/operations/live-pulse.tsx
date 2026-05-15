"use client";

import { cn } from "@/lib/utils";

interface LivePulseProps {
  className?: string;
  label?: string;
}

export function LivePulse({ className, label = "Live" }: LivePulseProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700",
        className
      )}
    >
      <span className="relative inline-flex size-2">
        <span className="absolute inset-0 inline-flex size-2 animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      {label}
    </span>
  );
}
