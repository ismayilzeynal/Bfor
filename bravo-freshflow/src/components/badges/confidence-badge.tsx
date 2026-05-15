import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";

interface ConfidenceBadgeProps {
  score: number;
  className?: string;
  showIcon?: boolean;
}

function tone(score: number): string {
  if (score >= 85) return "bg-emerald-100 text-emerald-700";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function ConfidenceBadge({ score, className, showIcon = true }: ConfidenceBadgeProps) {
  const rounded = Math.round(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        tone(score),
        className
      )}
      title={`Data confidence: ${rounded}%`}
    >
      {showIcon ? <Gauge className="size-3" aria-hidden /> : null}
      {rounded}%
    </span>
  );
}
