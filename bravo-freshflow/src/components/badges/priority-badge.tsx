import { cn } from "@/lib/utils";
import { PRIORITY_CLASSES, PRIORITY_LABELS } from "@/lib/constants";
import type { Priority } from "@/types";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        PRIORITY_CLASSES[priority],
        className
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
