import { cn } from "@/lib/utils";
import { RISK_LEVEL_CLASSES, RISK_LEVEL_LABELS } from "@/lib/constants";
import type { RiskLevel } from "@/types";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
  showDot?: boolean;
}

export function RiskBadge({ level, className, showDot = true }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        RISK_LEVEL_CLASSES[level],
        className
      )}
    >
      {showDot ? (
        <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      ) : null}
      {RISK_LEVEL_LABELS[level]}
    </span>
  );
}
