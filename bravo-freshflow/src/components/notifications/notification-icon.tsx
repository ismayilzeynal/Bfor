import {
  AlertTriangle,
  CheckSquare,
  ClipboardList,
  Clock,
  AlarmClock,
  Truck,
  PackageX,
  DatabaseZap,
  Building2,
  Sparkles,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NotificationType } from "@/types";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationType, LucideIcon> = {
  critical_risk: AlertTriangle,
  approval_needed: CheckSquare,
  task_assigned: ClipboardList,
  task_deadline_approaching: Clock,
  task_expired: AlarmClock,
  transfer_pending: Truck,
  stock_mismatch: PackageX,
  low_data_confidence: DatabaseZap,
  supplier_issue: Building2,
  result_ready: Sparkles,
};

const TONES: Record<NotificationType, string> = {
  critical_risk: "bg-rose-100 text-rose-700",
  approval_needed: "bg-orange-100 text-orange-700",
  task_assigned: "bg-sky-100 text-sky-700",
  task_deadline_approaching: "bg-amber-100 text-amber-700",
  task_expired: "bg-rose-100 text-rose-700",
  transfer_pending: "bg-indigo-100 text-indigo-700",
  stock_mismatch: "bg-orange-100 text-orange-700",
  low_data_confidence: "bg-amber-100 text-amber-700",
  supplier_issue: "bg-orange-100 text-orange-700",
  result_ready: "bg-emerald-100 text-emerald-700",
};

interface NotificationIconProps {
  type: NotificationType;
  className?: string;
}

export function NotificationIcon({ type, className }: NotificationIconProps) {
  const Icon = ICONS[type] ?? Bell;
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        TONES[type] ?? "bg-slate-100 text-slate-700",
        className
      )}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export const NOTIF_TYPE_TONE = TONES;
