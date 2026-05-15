import { cn } from "@/lib/utils";
import {
  RECOMMENDATION_STATUS_CLASSES,
  RECOMMENDATION_STATUS_LABELS,
  TASK_STATUS_CLASSES,
  TASK_STATUS_LABELS,
  TRANSFER_STATUS_CLASSES,
  TRANSFER_STATUS_LABELS,
  DISCOUNT_STATUS_CLASSES,
  DISCOUNT_STATUS_LABELS,
} from "@/lib/constants";
import type {
  RecommendationStatus,
  TaskStatus,
  TransferStatus,
  DiscountStatus,
} from "@/types";

type StatusBadgeProps =
  | { kind: "recommendation"; status: RecommendationStatus; className?: string }
  | { kind: "task"; status: TaskStatus; className?: string }
  | { kind: "transfer"; status: TransferStatus; className?: string }
  | { kind: "discount"; status: DiscountStatus; className?: string };

export function StatusBadge(props: StatusBadgeProps) {
  let label = "";
  let classes = "";
  switch (props.kind) {
    case "recommendation":
      label = RECOMMENDATION_STATUS_LABELS[props.status];
      classes = RECOMMENDATION_STATUS_CLASSES[props.status];
      break;
    case "task":
      label = TASK_STATUS_LABELS[props.status];
      classes = TASK_STATUS_CLASSES[props.status];
      break;
    case "transfer":
      label = TRANSFER_STATUS_LABELS[props.status];
      classes = TRANSFER_STATUS_CLASSES[props.status];
      break;
    case "discount":
      label = DISCOUNT_STATUS_LABELS[props.status];
      classes = DISCOUNT_STATUS_CLASSES[props.status];
      break;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        classes,
        props.className
      )}
    >
      {label}
    </span>
  );
}
